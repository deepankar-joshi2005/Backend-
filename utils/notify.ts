// Notification engine — Module Scope doc, Section 6.1: "Notification engine
// (in-app + email + WhatsApp) — core shared service triggered by events in
// every module". Every event-driven notification in CA-Management goes through
// dispatchNotification() (email + WhatsApp to one recipient) and/or
// createNotification() (in-app bell). HRMS has its own thin wrapper on top of
// this (hrms/utils/hrmsNotify.ts) because its users/in-app store differ.
//
// Rules applied here, centrally, so no call site has to remember them:
//  - Recipient opt-out per channel (notificationPreferences.email/.whatsapp, and
//    the platform-wide WhatsApp STOP list) — Module Scope 6.1.
//  - Automated notifications pause once a CA firm's licence is past its grace
//    period or the firm is suspended — Multi-Tenancy & Licensing doc, Section 7.
//  - Every attempt is logged to NotificationLog (WhatsApp usage metering per
//    firm — Multi-Tenancy doc, Sections 5/6).
//  - Never throws: a failed notification must never fail the action behind it.

import CaFirm from "../models/CaFirm";
import NotificationLog from "../models/NotificationLog";
import { getGraceInfo } from "./licenceGrace";
import { createNotification } from "./createNotification";
import { sendMail } from "./sendMail";
import { sendWhatsAppEvent, WhatsAppDocument, WhatsAppSendResult } from "./whatsapp";

export type NotificationPreferences = { inApp?: boolean; email?: boolean; whatsapp?: boolean } | null | undefined;

export type NotificationRecipient = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  preferences?: NotificationPreferences;
};

type ChannelResult = { status: "sent" | "failed" | "skipped"; reason?: string | null };

// Why a firm's automated notifications are paused right now, or null if they
// aren't. Same lapse rules requireActiveFirm enforces for API writes.
export async function getFirmNotificationPause(caFirmId) {
  if (!caFirmId) return null;
  try {
    const firm = await CaFirm.findById(caFirmId).select("isActive plan.status plan.expiryDate").lean();
    if (!firm) return "firm_not_found";
    if (!firm.isActive || firm.plan?.status === "suspended") return "firm_suspended";
    if (getGraceInfo(firm.plan).isReadOnly) return "firm_licence_lapsed";
    return null;
  } catch {
    return null;
  }
}

async function log(entry) {
  try {
    await NotificationLog.create(entry);
  } catch (err) {
    console.error("Failed to write notification log:", err.message);
  }
}

export async function dispatchNotification({
  event,
  caFirmId = null,
  hrmsCompanyId = null,
  recipient,
  email,
  whatsapp,
  respectFirmPause = true,
  ignoreEmailPreference = false,
}: {
  event: string;
  caFirmId?: any;
  hrmsCompanyId?: any;
  recipient: NotificationRecipient;
  email?: { subject: string; html: string; attachments?: any[] } | null;
  whatsapp?: { params: Record<string, unknown>; fallbackText: string; document?: WhatsAppDocument | null } | null;
  // HRMS keeps working through a CA firm's lapse (Multi-Tenancy doc, Section 7),
  // so HRMS notifications pass false here.
  respectFirmPause?: boolean;
  // Login credentials for a brand-new account must always go out by email.
  ignoreEmailPreference?: boolean;
}): Promise<{ email: ChannelResult; whatsapp: ChannelResult }> {
  const result: { email: ChannelResult; whatsapp: ChannelResult } = {
    email: { status: "skipped", reason: "not_requested" },
    whatsapp: { status: "skipped", reason: "not_requested" },
  };

  try {
    const pause = respectFirmPause ? await getFirmNotificationPause(caFirmId) : null;
    const prefs = recipient?.preferences || {};
    const base = { event, caFirmId: caFirmId || null, hrmsCompanyId: hrmsCompanyId || null, recipientName: recipient?.name || null };

    // ── Email ──
    if (email) {
      const to = recipient?.email?.trim();
      let reason = null;
      if (pause) reason = pause;
      else if (!to) reason = "no_email_address";
      else if (prefs.email === false && !ignoreEmailPreference) reason = "recipient_opted_out";

      if (reason) {
        result.email = { status: "skipped", reason };
      } else {
        try {
          const delivered = await sendMail({ to, subject: email.subject, html: email.html, attachments: email.attachments });
          result.email = delivered ? { status: "sent" } : { status: "skipped", reason: "smtp_not_configured" };
        } catch (err) {
          console.error(`Email send failed (${event} → ${to}):`, err.message);
          result.email = { status: "failed", reason: err.message };
        }
      }
      await log({ ...base, channel: "email", to: to || null, ...result.email });
    }

    // ── WhatsApp ──
    if (whatsapp) {
      let wa: WhatsAppSendResult;
      if (pause) wa = { status: "skipped", reason: pause, to: recipient?.phone || null };
      else if (prefs.whatsapp === false) wa = { status: "skipped", reason: "recipient_opted_out", to: recipient?.phone || null };
      else {
        wa = await sendWhatsAppEvent({
          event,
          phone: recipient?.phone,
          params: { recipientName: recipient?.name, ...whatsapp.params },
          fallbackText: whatsapp.fallbackText,
          document: whatsapp.document,
        });
      }
      result.whatsapp = { status: wa.status, reason: wa.reason || null };
      // "not configured" is the normal state until Meta keys are added — don't
      // fill the log with one row per event for it.
      if (wa.reason !== "whatsapp_not_configured") {
        await log({
          ...base,
          channel: "whatsapp",
          to: wa.to || recipient?.phone || null,
          status: wa.status,
          reason: wa.reason || null,
          template: wa.template || null,
          providerMessageId: wa.providerMessageId || null,
        });
      }
    }
  } catch (err) {
    console.error(`Notification dispatch failed (${event}):`, err.message);
  }

  return result;
}

// Fire-and-forget variant for call sites that shouldn't wait on SMTP/Meta
// round trips before responding.
export function dispatchNotificationInBackground(args: Parameters<typeof dispatchNotification>[0]) {
  dispatchNotification(args).catch((err) => console.error(`Notification dispatch failed (${args.event}):`, err.message));
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function appUrl(path = "") {
  const base = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

// In-app (bell) + email + WhatsApp for one CA-Management user (firm admin/staff
// or a business client admin), honouring that user's own channel preferences.
export async function notifyCaUser({
  user,
  caFirmId,
  event,
  inApp,
  email,
  whatsapp,
  respectFirmPause = true,
}: {
  user: any;
  caFirmId: any;
  event: string;
  inApp?: { title: string; message: string; type?: string; link?: string | null } | null;
  email?: { subject: string; html: string; attachments?: any[] } | null;
  whatsapp?: { params: Record<string, unknown>; fallbackText: string } | null;
  respectFirmPause?: boolean;
}) {
  if (!user) return;
  const prefs = user.notificationPreferences || {};
  try {
    if (inApp && prefs.inApp !== false) {
      await createNotification({
        title: inApp.title,
        message: inApp.message,
        type: inApp.type || "info",
        scope: "firm",
        caFirmId,
        userId: user._id,
        link: inApp.link ?? null,
      });
    }
  } catch (err) {
    console.error(`In-app notification failed (${event}):`, err.message);
  }

  if (email || whatsapp) {
    await dispatchNotification({
      event,
      caFirmId,
      recipient: { name: user.name, email: user.email, phone: user.phone, preferences: prefs },
      email,
      whatsapp,
      respectFirmPause,
    });
  }
}

// Monthly WhatsApp quota for a firm — Multi-Tenancy & Licensing doc, Section 5.
// null = custom/unlimited.
export function resolveWhatsAppQuota(firm, settings) {
  if (firm?.plan?.whatsappQuota !== null && firm?.plan?.whatsappQuota !== undefined) return firm.plan.whatsappQuota;
  const tier = firm?.plan?.tier || "starter";
  if (tier === "growth") return settings.whatsappQuotaGrowth ?? null;
  if (tier === "enterprise") return settings.whatsappQuotaEnterprise ?? null;
  return settings.whatsappQuotaStarter ?? null;
}

export function currentMonthRange(now = new Date()) {
  // Calendar month in IST, the billing timezone for every firm on the platform.
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  const start = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 330 * 60 * 1000);
  const end = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 1) - 330 * 60 * 1000);
  return { start, end };
}
