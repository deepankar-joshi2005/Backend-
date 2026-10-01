// HRMS side of the notification engine — Module Scope doc, Section 6.1:
// "Notification engine (in-app + email + WhatsApp) — core shared service
// triggered by events in every module", incl. "HRMS leave status alerts to
// employee via WhatsApp/email — auto-sent when Business Client Admin
// approves/rejects leave".
//
// notifyHrmsUser() sends one event to one HRMS user on all three channels:
//  - in-app: HrmsNotification row + live socket push ("notification:new");
//  - email: HRMS's own SMTP transport, branded with the user's company name;
//  - WhatsApp: the shared Meta client (utils/whatsapp.ts) — a no-op until the
//    WhatsApp env vars are set, then automatic.
// Honours the user's own per-channel preferences and the WhatsApp STOP list,
// logs email/WhatsApp attempts to NotificationLog (billed to the parent CA firm
// — Multi-Tenancy doc, Section 6), and never throws.
//
// HRMS notifications deliberately do NOT pause when the parent CA firm's
// licence lapses: "Business Client Admin/Employees keep their own HRMS access
// uninterrupted" (Multi-Tenancy doc, Section 7).

import User from "../models/User";
import Company from "../models/hrms/Company";
import HrmsNotification from "../models/hrms/HrmsNotification";
import NotificationLog from "../../models/NotificationLog";
import { getSocketIO } from "../socket/messageSocket";
import { CommonEmailType, getCommonTemplate, hrmsLoginUrl, sendBrandedMail } from "./email";
import { sendWhatsAppEvent } from "../../utils/whatsapp";
import { ROLES } from "../constants";

// An email is one of: an existing CommonEmailType template, a simple
// heading + paragraphs email (branded here, once the company is known), or
// fully pre-built content.
type HrmsEmail =
  | { template: CommonEmailType; data?: any }
  | { heading: string; lines: string[] }
  | { subject: string; html: string; attachments?: any[] };

export type HrmsNotifyArgs = {
  user?: any; // a loaded HRMS user doc, or…
  userId?: any; // …just its id
  event: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string | null;
  email?: HrmsEmail | null;
  whatsapp?: { params?: Record<string, unknown>; fallbackText?: string } | null;
  // e.g. the credentials email was already sent by the caller.
  skipEmail?: boolean;
};

async function log(entry) {
  try {
    await NotificationLog.create(entry);
  } catch (err) {
    console.error("Failed to write notification log:", (err as Error).message);
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Simple branded email for events without a dedicated CommonEmailType template.
export function hrmsEventEmail(brand: string, name: string, heading: string, lines: string[]) {
  return {
    subject: `${heading} — ${brand}`,
    html: `
      <div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
        <h2 style="color:#0066ff">${escapeHtml(brand)}</h2>
        <p>Hi <b>${escapeHtml(name)}</b>,</p>
        ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        <hr/>
        <p style="font-size:12px;color:#777">This is an automated email. Please do not reply.</p>
      </div>
    `,
  };
}

export async function notifyHrmsUser(args: HrmsNotifyArgs) {
  const { event, title, message, type = "info", link = null, email, whatsapp, skipEmail } = args;
  try {
    const user: any =
      args.user && args.user.email !== undefined
        ? args.user
        : await User.findById(args.userId || args.user).select("name email mobile role companyId notificationPreferences isCaProxy").lean();
    // The CA-proxy account is a synthetic login, never a person to notify.
    if (!user || user.isCaProxy) return;

    const company: any = user.companyId ? await Company.findById(user.companyId).select("name caFirmId").lean() : null;
    const brand = company?.name || process.env.HRMS_BRAND_NAME || "HRMS";
    const prefs = user.notificationPreferences || {};
    const logBase = {
      event,
      caFirmId: company?.caFirmId || null,
      hrmsCompanyId: user.companyId || null,
      recipientName: user.name || null,
    };

    // ── In-app ──
    if (prefs.inApp !== false) {
      try {
        const notification = await HrmsNotification.create({
          recipient: user._id,
          companyId: user.companyId || null,
          event,
          title,
          message,
          type,
          link,
        });
        getSocketIO()?.to(`user:${user._id}`).emit("notification:new", notification);
      } catch (err) {
        console.error(`HRMS in-app notification failed (${event}):`, (err as Error).message);
      }
    }

    // ── Email ──
    if (email && !skipEmail) {
      let status = "sent";
      let reason = null;
      if (!user.email) [status, reason] = ["skipped", "no_email_address"];
      else if (prefs.email === false) [status, reason] = ["skipped", "recipient_opted_out"];
      else {
        try {
          const content: { subject: string; html: string; attachments?: any[] } =
            "template" in email
              ? getCommonTemplate({ type: email.template, name: user.name, data: email.data, brand })
              : "heading" in email
                ? hrmsEventEmail(brand, user.name, email.heading, email.lines)
                : email;
          await sendBrandedMail({
            to: user.email,
            subject: content.subject,
            html: content.html,
            brand,
            attachments: content.attachments,
          });
        } catch (err) {
          status = "failed";
          reason = (err as Error).message;
          console.error(`HRMS email failed (${event} → ${user.email}):`, reason);
        }
      }
      await log({ ...logBase, channel: "email", to: user.email || null, status, reason });
    }

    // ── WhatsApp ──
    if (whatsapp) {
      const wa =
        prefs.whatsapp === false
          ? { status: "skipped", reason: "recipient_opted_out", to: user.mobile || null, template: null, providerMessageId: null }
          : await sendWhatsAppEvent({
              event,
              phone: user.mobile,
              params: {
                recipientName: user.name,
                companyName: brand,
                organisationName: brand,
                senderName: brand,
                ...(whatsapp.params || {}),
              },
              fallbackText: whatsapp.fallbackText || message,
            });
      if (wa.reason !== "whatsapp_not_configured") {
        await log({
          ...logBase,
          channel: "whatsapp",
          to: wa.to || user.mobile || null,
          status: wa.status,
          reason: wa.reason || null,
          template: wa.template || null,
          providerMessageId: wa.providerMessageId || null,
        });
      }
    }
  } catch (err) {
    console.error(`HRMS notification failed (${event}):`, (err as Error).message);
  }
}

// Fire-and-forget: notification delivery must never hold up or fail the API
// response for the action that triggered it.
export function notifyHrmsUserInBackground(args: HrmsNotifyArgs) {
  notifyHrmsUser(args).catch((err) => console.error(`HRMS notification failed (${args.event}):`, err.message));
}

// Company-level approvers for an employee's request: their reporting manager
// if they have one, otherwise the company's admin/HR accounts.
export async function findApprovers(employee: any) {
  if (employee?.managerId) {
    const manager = await User.findById(employee.managerId).select("name email mobile role companyId notificationPreferences isCaProxy").lean();
    if (manager) return [manager];
  }
  if (!employee?.companyId) return [];
  return User.find({
    companyId: employee.companyId,
    role: { $in: [ROLES.SuperAdmin, ROLES.HRAdmin, ROLES.Admin.toLowerCase()] },
    isCaProxy: { $ne: true },
    status: { $ne: "INACTIVE" },
  })
    .select("name email mobile role companyId notificationPreferences isCaProxy")
    .lean();
}

export function formatHrmsDate(value: any) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

// Employee request approved/rejected/paid (travel, expense, leave encashment,
// overtime, profile update) — Module Scope doc, Section 2 "Team Approvals" /
// "Payment Requests (Finance)" + Section 6.1 status-change notifications.
export function notifyRequestStatus({
  employeeId,
  requestType,
  status,
  link,
}: {
  employeeId: any;
  requestType: string;
  status: string;
  link: string;
}) {
  if (!employeeId) return;
  const label = String(status).toLowerCase();
  const pretty = label.charAt(0).toUpperCase() + label.slice(1);
  notifyHrmsUserInBackground({
    userId: employeeId,
    event: "hrms_request_status",
    title: `${requestType} request ${label}`,
    message: `Your ${requestType.toLowerCase()} request has been ${label}.`,
    type: label === "rejected" ? "warning" : "success",
    link,
    email: { heading: `${requestType} request ${label}`, lines: [`Your ${requestType.toLowerCase()} request has been ${label}.`] },
    whatsapp: {
      params: { requestType, status: pretty },
      fallbackText: `Your ${requestType.toLowerCase()} request has been ${label}.`,
    },
  });
}

// A new HRMS login was created (Add User / bulk upload). The credentials email
// itself is sent by the caller (sendUserCredentialsEmail) — this adds the
// in-app welcome and a WhatsApp heads-up that deliberately carries no password.
export function notifyHrmsAccountCreated(user: any) {
  notifyHrmsUserInBackground({
    user,
    event: "user_account_created",
    title: "Welcome!",
    message: "Your HRMS account is ready. Complete your profile and upload your documents to get started.",
    link: "/hrms/employee/profile/personal",
    whatsapp: {
      params: { loginEmail: user.email, loginUrl: hrmsLoginUrl() },
      fallbackText: `Your HRMS account has been created. Log in at ${hrmsLoginUrl()} with ${user.email} — your password has been sent to your email.`,
    },
  });
}
