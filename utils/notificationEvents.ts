// Every automated notification event in CA-Management, in one place, mapped to
// the requirement docs. Controllers/jobs call these; these call the engine in
// utils/notify.ts (in-app + email + WhatsApp, opt-outs, licence pause, logging).
//
//  Module Scope doc, Section 6.1:
//   - "Compliance deadline alerts to business client via WhatsApp/email"
//        → sendComplianceDeadlineReminder (jobs/notificationJobs.ts)
//   - "CRM follow-up reminders to leads/clients via WhatsApp/email"
//        → sendCrmFollowUpReminder (jobs/notificationJobs.ts)
//   - "Loan Calculator result sharing via WhatsApp" (now Personal Finance Tracker)
//        → shareFinanceReport
//   - "automatic … for relevant events (a deadline approaching, a status
//      change, a new record)" → task/lead assignment, task completed, lead
//      converted
//  Multi-Tenancy & Licensing doc, Section 4:
//   - 4.1 "System auto-creates the CA Firm Admin account and sends login credentials"
//   - 4.2 "System invites the Business Client Admin via email/WhatsApp"
//        → notifyAccountCreated / notifyBusinessClientInvite

import CaFirm from "../models/CaFirm";
import Lead from "../models/Lead";
import User from "../models/User";
import BusinessClient from "../models/BusinessClient";
import { getSystemSettings } from "./getSystemSettings";
import { credentialsWelcomeEmail, notificationEmail } from "./emailTemplates";
import { createNotification } from "./createNotification";
import { appUrl, dispatchNotification, dispatchNotificationInBackground, formatDate, notifyCaUser } from "./notify";
import { normalizePhone } from "./whatsapp";

const COMPLIANCE_CATEGORY_LABELS = { gst: "GST", tds: "TDS", roc: "ROC", income_tax: "Income Tax", other: "Compliance" };
const FOLLOWUP_TYPE_LABELS = { call: "call", email: "email", whatsapp: "WhatsApp", meeting: "meeting" };

async function firmName(caFirmId) {
  const firm = await CaFirm.findById(caFirmId).select("name").lean();
  return firm?.name || "your CA";
}

// Who to contact about a client (a CRM Lead): the lead's own phone/email,
// falling back to the linked Business Client's, plus that business client's
// admin login (for an in-app bell notification on the client portal).
export async function loadClientContact(leadRef) {
  // Accepts an id or an already-populated Lead (controllers populate clientId
  // for their response while a background notification may still be running).
  const leadId = leadRef?._id || leadRef;
  if (!leadId) return null;
  const lead: any = await Lead.findById(leadId).select("name company phone email notificationPreferences businessClientId caFirmId").lean();
  if (!lead) return null;

  let businessClient: any = null;
  let clientAdmin: any = null;
  if (lead.businessClientId) {
    [businessClient, clientAdmin] = await Promise.all([
      BusinessClient.findById(lead.businessClientId).select("name phone email contactPerson").lean(),
      User.findOne({ businessClientId: lead.businessClientId, role: "business_client_admin", isActive: true }).lean(),
    ]);
  }

  return {
    lead,
    businessClient,
    clientAdmin,
    recipient: {
      name: lead.name,
      email: lead.email || businessClient?.email || null,
      phone: normalizePhone(lead.phone) ? lead.phone : businessClient?.phone || null,
      preferences: lead.notificationPreferences,
    },
  };
}

function dueInLabel(daysBefore) {
  if (daysBefore === 0) return "today";
  if (daysBefore === 1) return "tomorrow";
  if (daysBefore < 0) return `${Math.abs(daysBefore)} day(s) ago`;
  return `in ${daysBefore} days`;
}

// ───────────────────────── Compliance Tool ─────────────────────────

export async function notifyComplianceTaskAssigned(task, assigneeId, actorId) {
  if (!assigneeId || String(assigneeId) === String(actorId)) return;
  const [assignee, firm, contact] = await Promise.all([
    User.findById(assigneeId).lean(),
    firmName(task.caFirmId),
    loadClientContact(task.clientId),
  ]);
  if (!assignee) return;
  const clientName = contact?.lead?.name || "a client";
  const basePath = assignee.role === "ca_firm_admin" ? "firm-admin" : "firm-staff";

  await notifyCaUser({
    user: assignee,
    caFirmId: task.caFirmId,
    event: "compliance_task_assigned",
    inApp: {
      title: "Compliance task assigned to you",
      message: `${task.title} for ${clientName} — due ${formatDate(task.dueDate)}.`,
      type: "task",
      link: "compliance",
    },
    email: {
      subject: `New compliance task: ${task.title} (${clientName})`,
      html: notificationEmail({
        brandName: firm,
        recipientName: assignee.name,
        heading: "A compliance task has been assigned to you",
        intro: "Here are the details:",
        details: [
          ["Task", task.title],
          ["Category", COMPLIANCE_CATEGORY_LABELS[task.category] || task.category],
          ["Client", clientName],
          ["Due date", formatDate(task.dueDate)],
        ],
        ctaLabel: "Open Compliance Tool",
        ctaUrl: appUrl(`/${basePath}/compliance`),
      }),
    },
  });
}

export async function notifyComplianceTaskCompleted(task) {
  const [firm, contact] = await Promise.all([firmName(task.caFirmId), loadClientContact(task.clientId)]);
  if (!contact) return;

  if (contact.clientAdmin) {
    await createNotification({
      title: "Compliance filing completed",
      message: `${firm} has completed "${task.title}" for you.`,
      type: "info",
      scope: "firm",
      caFirmId: task.caFirmId,
      userId: contact.clientAdmin._id,
      link: "",
    });
  }

  await dispatchNotification({
    event: "compliance_task_completed",
    caFirmId: task.caFirmId,
    recipient: contact.recipient,
    email: {
      subject: `${task.title} — completed`,
      html: notificationEmail({
        brandName: firm,
        recipientName: contact.recipient.name,
        heading: "Your compliance task is complete",
        intro: `${firm} has marked the following compliance task as done.`,
        details: [
          ["Task", task.title],
          ["Category", COMPLIANCE_CATEGORY_LABELS[task.category] || task.category],
          ["Due date", formatDate(task.dueDate)],
        ],
      }),
    },
    whatsapp: {
      params: { taskTitle: task.title, firmName: firm, senderName: firm },
      fallbackText: `Your compliance task "${task.title}" has been completed by ${firm}.`,
    },
  });
}

// Module Scope doc, Section 6.1 — "Compliance deadline alerts to business
// client via WhatsApp/email — auto-sent based on Compliance Tool due dates".
// The assigned staff member also gets an in-app + email heads-up, and an
// overdue alert (daysBefore < 0) goes to staff only.
export async function sendComplianceDeadlineReminder(task, daysBefore) {
  const [firm, contact, assignee] = await Promise.all([
    firmName(task.caFirmId),
    loadClientContact(task.clientId),
    task.assignedTo ? User.findById(task.assignedTo).lean() : null,
  ]);
  const clientName = contact?.lead?.name || "client";
  const due = formatDate(task.dueDate);
  const dueIn = dueInLabel(daysBefore);
  const category = COMPLIANCE_CATEGORY_LABELS[task.category] || task.category;

  if (contact && daysBefore >= 0) {
    if (contact.clientAdmin) {
      await createNotification({
        title: `${category} deadline ${dueIn}`,
        message: `"${task.title}" is due on ${due}. Please share any pending documents with ${firm}.`,
        type: "reminder",
        scope: "firm",
        caFirmId: task.caFirmId,
        userId: contact.clientAdmin._id,
        link: "",
      });
    }

    await dispatchNotification({
      event: "compliance_deadline_reminder",
      caFirmId: task.caFirmId,
      recipient: contact.recipient,
      email: {
        subject: `Reminder: ${task.title} is due ${dueIn} (${due})`,
        html: notificationEmail({
          brandName: firm,
          recipientName: clientName,
          heading: `${category} deadline ${dueIn}`,
          intro: `This is a reminder from ${firm} that the following compliance is due ${dueIn}. Please share any pending documents or information so it can be filed on time.`,
          details: [
            ["Compliance", task.title],
            ["Category", category],
            ["Due date", due],
          ],
        }),
      },
      whatsapp: {
        params: { taskTitle: task.title, dueDate: due, dueIn, firmName: firm, senderName: firm },
        fallbackText: `Reminder: "${task.title}" is due ${dueIn} (${due}). Please share any pending documents with ${firm}.`,
      },
    });
  }

  if (assignee) {
    const overdue = daysBefore < 0;
    const basePath = assignee.role === "ca_firm_admin" ? "firm-admin" : "firm-staff";
    await notifyCaUser({
      user: assignee,
      caFirmId: task.caFirmId,
      event: overdue ? "compliance_task_overdue" : "compliance_deadline_staff",
      inApp: {
        title: overdue ? "Compliance task overdue" : `Compliance due ${dueIn}`,
        message: `${task.title} for ${clientName} — due ${due}.`,
        type: overdue ? "warning" : "reminder",
        link: "compliance",
      },
      email: {
        subject: overdue ? `Overdue: ${task.title} (${clientName})` : `Due ${dueIn}: ${task.title} (${clientName})`,
        html: notificationEmail({
          brandName: firm,
          recipientName: assignee.name,
          heading: overdue ? "A compliance task is overdue" : `A compliance task is due ${dueIn}`,
          intro: overdue ? "This task is past its due date and still open." : "This task assigned to you is coming up.",
          details: [
            ["Task", task.title],
            ["Client", clientName],
            ["Due date", due],
            ["Status", task.status],
          ],
          ctaLabel: "Open Compliance Tool",
          ctaUrl: appUrl(`/${basePath}/compliance`),
        }),
      },
    });
  }
}

// ───────────────────────── CRM ─────────────────────────

export async function notifyLeadAssigned(lead, assigneeId, actorId) {
  if (!assigneeId || String(assigneeId) === String(actorId)) return;
  const [assignee, firm] = await Promise.all([User.findById(assigneeId).lean(), firmName(lead.caFirmId)]);
  if (!assignee) return;
  const basePath = assignee.role === "ca_firm_admin" ? "firm-admin" : "firm-staff";

  await notifyCaUser({
    user: assignee,
    caFirmId: lead.caFirmId,
    event: "crm_lead_assigned",
    inApp: {
      title: "Lead assigned to you",
      message: `${lead.name}${lead.company ? ` (${lead.company})` : ""} has been assigned to you.`,
      type: "task",
      link: "crm",
    },
    email: {
      subject: `New lead assigned: ${lead.name}`,
      html: notificationEmail({
        brandName: firm,
        recipientName: assignee.name,
        heading: "A lead has been assigned to you",
        intro: "Here are the lead's details:",
        details: [
          ["Name", lead.name],
          ["Company", lead.company],
          ["Phone", lead.phone],
          ["Email", lead.email],
          ["Status", lead.status],
        ],
        ctaLabel: "Open CRM",
        ctaUrl: appUrl(`/${basePath}/crm`),
      }),
    },
  });
}

export async function notifyLeadConverted(lead) {
  const firm = await firmName(lead.caFirmId);
  await dispatchNotification({
    event: "crm_client_converted",
    caFirmId: lead.caFirmId,
    recipient: { name: lead.name, email: lead.email, phone: lead.phone, preferences: lead.notificationPreferences },
    email: {
      subject: `Welcome to ${firm}`,
      html: notificationEmail({
        brandName: firm,
        recipientName: lead.name,
        heading: `Welcome aboard, ${lead.name}!`,
        intro: `Thank you for choosing ${firm}. You are now a client — we will reach out with next steps and keep you updated on your compliance deadlines.`,
      }),
    },
    whatsapp: {
      params: { firmName: firm, senderName: firm },
      fallbackText: `Thank you for choosing ${firm}. You are now our client — we will keep you updated on your compliance deadlines here.`,
    },
  });
}

// Module Scope doc, Section 6.1 — "CRM follow-up reminders to leads/clients via
// WhatsApp/email — auto-sent based on CRM follow-up task due dates". The
// assigned staff member gets an in-app + email reminder too.
export async function sendCrmFollowUpReminder(lead) {
  const [firm, assignee] = await Promise.all([
    firmName(lead.caFirmId),
    lead.assignedTo ? User.findById(lead.assignedTo).lean() : null,
  ]);
  const when = formatDate(lead.followUpDate);
  const typeLabel = FOLLOWUP_TYPE_LABELS[lead.followUpType] || "follow-up";

  await dispatchNotification({
    event: "crm_followup_reminder",
    caFirmId: lead.caFirmId,
    recipient: { name: lead.name, email: lead.email, phone: lead.phone, preferences: lead.notificationPreferences },
    email: {
      subject: `${firm} — scheduled ${typeLabel} on ${when}`,
      html: notificationEmail({
        brandName: firm,
        recipientName: lead.name,
        heading: `Your ${typeLabel} with ${firm}`,
        intro: `This is a reminder that ${firm} has a ${typeLabel} scheduled with you on ${when}.`,
        details: [
          ["Date", when],
          ["Mode", typeLabel],
          ["Topic", lead.followUpNote],
        ],
      }),
    },
    whatsapp: {
      params: { followUpType: typeLabel, followUpDate: when, firmName: firm, senderName: firm },
      fallbackText: `Reminder: ${firm} has a ${typeLabel} scheduled with you on ${when}.`,
    },
  });

  if (assignee) {
    const basePath = assignee.role === "ca_firm_admin" ? "firm-admin" : "firm-staff";
    await notifyCaUser({
      user: assignee,
      caFirmId: lead.caFirmId,
      event: "crm_followup_staff",
      inApp: {
        title: "Follow-up due today",
        message: `${typeLabel} with ${lead.name}${lead.followUpNote ? ` — ${lead.followUpNote}` : ""}.`,
        type: "reminder",
        link: "crm",
      },
      email: {
        subject: `Follow-up due: ${lead.name} (${when})`,
        html: notificationEmail({
          brandName: firm,
          recipientName: assignee.name,
          heading: "You have a follow-up due",
          intro: "Scheduled in CRM:",
          details: [
            ["Lead", lead.name],
            ["Company", lead.company],
            ["Phone", lead.phone],
            ["Mode", typeLabel],
            ["Date", when],
            ["Note", lead.followUpNote],
          ],
          ctaLabel: "Open CRM",
          ctaUrl: appUrl(`/${basePath}/crm`),
        }),
      },
    });
  }
}

// ───────────────────────── Onboarding / new users ─────────────────────────

// A new login was created for someone (CA firm admin, CA staff) — credentials
// by email (always, regardless of preferences), and a WhatsApp heads-up that
// deliberately carries no password.
export function notifyAccountCreated({
  caFirmId,
  organisationName,
  name,
  email,
  phone,
  password,
}: {
  caFirmId: any;
  organisationName: string;
  name: string;
  email: string;
  phone?: string | null;
  password?: string | null;
}) {
  (async () => {
    const settings = await getSystemSettings();
    const loginUrl = appUrl("/login");
    const mail = password
      ? credentialsWelcomeEmail({ platformName: settings.platformName, firmName: organisationName, recipientName: name, email, password, loginUrl })
      : {
          subject: `Welcome to ${settings.platformName}`,
          html: notificationEmail({
            brandName: settings.platformName,
            recipientName: name,
            heading: `Welcome to ${settings.platformName}`,
            intro: `Your account for ${organisationName} is ready. Log in with ${email} and the password you set.`,
            ctaLabel: `Log in to ${settings.platformName}`,
            ctaUrl: loginUrl,
          }),
        };

    await dispatchNotification({
      event: "user_account_created",
      caFirmId,
      respectFirmPause: false,
      ignoreEmailPreference: true,
      recipient: { name, email, phone },
      email: mail,
      whatsapp: {
        params: { organisationName, loginEmail: email, loginUrl, senderName: settings.platformName },
        fallbackText: `Your ${settings.platformName} account for ${organisationName} has been created. Log in at ${loginUrl} with ${email}${password ? " — your password has been sent to your email" : ""}.`,
      },
    });
  })().catch((err) => console.error("Account-created notification failed:", err.message));
}

// Multi-Tenancy doc, Section 4.2 step 3 — "System invites the Business Client
// Admin via email/WhatsApp with their own login".
export function notifyBusinessClientInvite({ client, firm, admin, password }) {
  (async () => {
    const settings = await getSystemSettings();
    const loginUrl = appUrl("/login");
    const { subject, html } = credentialsWelcomeEmail({
      platformName: settings.platformName,
      firmName: client.name,
      recipientName: admin.name,
      email: admin.email,
      password: password || "(the password set for you by your CA)",
      loginUrl,
    });

    await dispatchNotification({
      event: "business_client_invite",
      caFirmId: firm._id,
      respectFirmPause: false,
      ignoreEmailPreference: true,
      recipient: { name: admin.name, email: admin.email, phone: admin.phone || client.phone },
      email: { subject, html },
      whatsapp: {
        params: { companyName: client.name, firmName: firm.name, loginEmail: admin.email, loginUrl, senderName: firm.name },
        fallbackText: `${firm.name} has set up ${client.name} on ${settings.platformName}. Log in at ${loginUrl} with ${admin.email} — your password has been sent to your email.`,
      },
    });
  })().catch((err) => console.error("Business client invite notification failed:", err.message));
}

// ───────────────────────── Personal Finance Tracker ─────────────────────────

// Module Scope doc, Section 6.1 — "Loan Calculator result sharing via WhatsApp:
// send saved calculation/PDF summary directly to client's WhatsApp". User-
// triggered (the "Send Report" button), so it reports per-channel results back.
export async function shareFinanceReport({ profile, caFirmId, channels, pdf, summary }) {
  const firm = await firmName(caFirmId);
  let preferences = null;
  if (profile.clientModel === "Lead" && profile.clientId) {
    const lead: any = await Lead.findById(profile.clientId).select("notificationPreferences").lean();
    preferences = lead?.notificationPreferences || null;
  }

  return dispatchNotification({
    event: "finance_report_shared",
    caFirmId,
    recipient: { name: profile.name, email: profile.email, phone: profile.phone, preferences },
    email: channels.includes("email")
      ? {
          subject: `Your personal finance report from ${firm}`,
          html: notificationEmail({
            brandName: firm,
            recipientName: profile.name,
            heading: "Your personal finance report",
            intro: `${firm} has shared your personal finance and loan eligibility report.${pdf ? " The full report is attached as a PDF." : ""}`,
            details: summary.details,
          }),
          attachments: pdf ? [{ filename: pdf.filename, content: pdf.buffer, contentType: "application/pdf" }] : undefined,
        }
      : null,
    whatsapp: channels.includes("whatsapp")
      ? {
          params: { firmName: firm, summary: summary.text, senderName: firm },
          fallbackText: `${firm} has shared your personal finance report. ${summary.text}`,
          document: pdf ? { buffer: pdf.buffer, filename: pdf.filename, mimeType: "application/pdf" } : null,
        }
      : null,
  });
}

export { dispatchNotificationInBackground };
