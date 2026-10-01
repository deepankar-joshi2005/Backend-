// WhatsApp Business (Meta Cloud API) client — Module Scope doc, Section 6.1:
// "WhatsApp Business API integration — requires a Meta WhatsApp Business API
// account and pre-approved message templates".
//
// Zero-config by design: nothing is sent (and nothing breaks) until
// WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set in .env. The moment
// they are, every event that already calls the notification engine starts
// delivering on WhatsApp too — no code change, no redeploy beyond restarting
// with the new env. See docs/WHATSAPP_SETUP.md for the full list of variables
// and the message templates to get approved on Meta.
//
// Business-initiated WhatsApp messages must use a pre-approved template, so
// every send goes through sendWhatsAppEvent(): it picks the event's own
// template if one is configured (WHATSAPP_TEMPLATE_<EVENT>), otherwise falls
// back to the single generic template (WHATSAPP_TEMPLATE_GENERIC) — so getting
// just ONE template approved is enough to switch WhatsApp on platform-wide.

import WhatsAppOptOut from "../models/WhatsAppOptOut";

export type WhatsAppDocument = { buffer: Buffer; filename: string; mimeType?: string };

export type WhatsAppSendResult = {
  status: "sent" | "failed" | "skipped";
  reason?: string | null;
  to?: string | null;
  template?: string | null;
  providerMessageId?: string | null;
};

// Body parameter order for each event's own template. The generic fallback
// template always takes [recipientName, message, senderName] instead.
// Keep in sync with docs/WHATSAPP_SETUP.md.
export const WHATSAPP_EVENTS: Record<string, { params: string[]; header?: "document" }> = {
  // ── CA practice modules (CRM / Compliance / Finance Tracker / onboarding) ──
  compliance_deadline_reminder: { params: ["recipientName", "taskTitle", "dueDate", "dueIn", "firmName"] },
  compliance_task_completed: { params: ["recipientName", "taskTitle", "firmName"] },
  crm_followup_reminder: { params: ["recipientName", "followUpType", "followUpDate", "firmName"] },
  crm_client_converted: { params: ["recipientName", "firmName"] },
  finance_report_shared: { params: ["recipientName", "firmName", "summary"], header: "document" },
  business_client_invite: { params: ["recipientName", "companyName", "firmName", "loginEmail", "loginUrl"] },
  user_account_created: { params: ["recipientName", "organisationName", "loginEmail", "loginUrl"] },
  // ── HRMS (employees of a CA firm's business client) ──
  hrms_leave_status: { params: ["recipientName", "status", "fromDate", "toDate", "companyName"] },
  hrms_leave_applied: { params: ["recipientName", "employeeName", "fromDate", "toDate", "companyName"] },
  hrms_attendance_request_status: { params: ["recipientName", "status", "companyName"] },
  hrms_shift_assigned: { params: ["recipientName", "shift", "date", "companyName"] },
  hrms_payslip_generated: { params: ["recipientName", "month", "companyName"] },
  hrms_resignation_status: { params: ["recipientName", "status", "companyName"] },
  hrms_letter_issued: { params: ["recipientName", "letterType", "companyName"] },
  hrms_request_status: { params: ["recipientName", "requestType", "status", "companyName"] },
};

function env(name: string, fallback = "") {
  return (process.env[name] || fallback).trim();
}

export function isWhatsAppConfigured() {
  if (env("WHATSAPP_ENABLED").toLowerCase() === "false") return false;
  return !!(env("WHATSAPP_ACCESS_TOKEN") && env("WHATSAPP_PHONE_NUMBER_ID"));
}

function graphUrl(path: string) {
  const version = env("WHATSAPP_API_VERSION", "v21.0");
  return `https://graph.facebook.com/${version}/${path}`;
}

// Digits only, with country code, as the Cloud API expects ("919876543210").
// A bare 10-digit Indian mobile gets WHATSAPP_DEFAULT_COUNTRY_CODE (91) prefixed.
// Returns null for anything that can't be a real number (placeholders such as
// "Not provided" or "0000000000" that some onboarding paths store).
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  const countryCode = env("WHATSAPP_DEFAULT_COUNTRY_CODE", "91").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `${countryCode}${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  if (/^0+$/.test(digits.slice(-10))) return null;
  return digits;
}

// Meta rejects template params that are empty or contain newlines/tabs or more
// than four consecutive spaces.
function cleanParam(value: unknown) {
  const text = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {4,}/g, "   ")
    .trim()
    .slice(0, 1000);
  return text || "-";
}

export async function isPhoneOptedOut(phone: string) {
  try {
    return !!(await WhatsAppOptOut.exists({ phone }));
  } catch {
    return false;
  }
}

async function callGraph(path: string, init: { method: string; headers?: Record<string, string>; body: any }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(env("WHATSAPP_TIMEOUT_MS", "15000")));
  try {
    const response = await fetch(graphUrl(path), {
      method: init.method,
      headers: { Authorization: `Bearer ${env("WHATSAPP_ACCESS_TOKEN")}`, ...(init.headers || {}) },
      body: init.body,
      signal: controller.signal,
    });
    const json: any = await response.json().catch(() => ({}));
    if (!response.ok || json?.error) {
      const message = json?.error?.error_user_msg || json?.error?.message || `HTTP ${response.status}`;
      throw new Error(message);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function uploadMedia(document: WhatsAppDocument) {
  const form = new FormData();
  const mimeType = document.mimeType || "application/pdf";
  form.append("messaging_product", "whatsapp");
  form.append("type", mimeType);
  form.append("file", new Blob([new Uint8Array(document.buffer)], { type: mimeType }), document.filename);
  const json = await callGraph(`${env("WHATSAPP_PHONE_NUMBER_ID")}/media`, { method: "POST", body: form });
  return json.id as string;
}

// Which template (and parameter list) an event resolves to right now, or null
// if WhatsApp can't be sent for it. "off" as a per-event value disables just
// that event even when the generic template is configured.
export function resolveTemplate(event: string, params: Record<string, unknown>, fallbackText: string) {
  const eventKey = `WHATSAPP_TEMPLATE_${event.toUpperCase()}`;
  const eventTemplate = env(eventKey);
  if (eventTemplate.toLowerCase() === "off") return null;

  const definition = WHATSAPP_EVENTS[event];
  if (eventTemplate && definition) {
    return {
      name: eventTemplate,
      bodyParams: definition.params.map((key) => cleanParam(params[key])),
      header: definition.header || null,
    };
  }

  const generic = env("WHATSAPP_TEMPLATE_GENERIC");
  if (!generic) return null;
  return {
    name: generic,
    bodyParams: [params.recipientName, fallbackText, params.senderName].map(cleanParam),
    header: null,
  };
}

// Never throws — returns a result object the caller logs. A WhatsApp failure
// must never break the business action (leave approval, onboarding, ...) that
// triggered it.
export async function sendWhatsAppEvent({
  event,
  phone,
  params,
  fallbackText,
  document,
}: {
  event: string;
  phone?: string | null;
  params: Record<string, unknown>;
  fallbackText: string;
  document?: WhatsAppDocument | null;
}): Promise<WhatsAppSendResult> {
  if (!isWhatsAppConfigured()) return { status: "skipped", reason: "whatsapp_not_configured" };

  const to = normalizePhone(phone);
  if (!to) return { status: "skipped", reason: "no_valid_phone", to: phone || null };
  if (await isPhoneOptedOut(to)) return { status: "skipped", reason: "recipient_replied_stop", to };

  const template = resolveTemplate(event, params, fallbackText);
  if (!template) return { status: "skipped", reason: "no_template_configured", to };

  try {
    const components: any[] = [];
    if (template.header === "document") {
      if (!document) return { status: "skipped", reason: "document_required_by_template", to, template: template.name };
      const mediaId = await uploadMedia(document);
      components.push({
        type: "header",
        parameters: [{ type: "document", document: { id: mediaId, filename: document.filename } }],
      });
    }
    components.push({ type: "body", parameters: template.bodyParams.map((text) => ({ type: "text", text })) });

    const json = await callGraph(`${env("WHATSAPP_PHONE_NUMBER_ID")}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template.name,
          language: { code: env("WHATSAPP_TEMPLATE_LANGUAGE", "en") },
          components,
        },
      }),
    });

    return { status: "sent", to, template: template.name, providerMessageId: json?.messages?.[0]?.id || null };
  } catch (err: any) {
    console.error(`WhatsApp send failed (${event} → ${to}):`, err.message);
    return { status: "failed", reason: err.message, to, template: template.name };
  }
}
