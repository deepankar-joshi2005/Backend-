import crypto from "crypto";
import NotificationLog from "../models/NotificationLog";
import WhatsAppOptOut from "../models/WhatsAppOptOut";
import { normalizePhone } from "../utils/whatsapp";

// Meta WhatsApp Cloud API webhook. Configure in the Meta App dashboard →
// WhatsApp → Configuration:
//   Callback URL:  <backend origin>/api/v1/whatsapp/webhook
//   Verify token:  the value of WHATSAPP_WEBHOOK_VERIFY_TOKEN
// and subscribe to the "messages" field. Handles:
//  - delivery status updates (sent/delivered/read/failed) → NotificationLog;
//  - inbound "STOP" / "START" replies → platform-wide WhatsApp opt-out list
//    (Module Scope doc, Section 6.1 — consent/opt-out per channel).

const STOP_WORDS = new Set(["STOP", "UNSUBSCRIBE", "OPT OUT", "OPTOUT", "CANCEL"]);
const START_WORDS = new Set(["START", "SUBSCRIBE", "OPT IN", "OPTIN", "UNSTOP"]);

export const verifyWebhook = (req, res) => {
  // Read straight from the URL: sanitizeInputs strips dotted keys ("hub.mode")
  // from parsed input as a Mongo-injection guard.
  const params = new URL(req.originalUrl, "http://localhost").searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected) {
    return res.status(200).type("text/plain").send(challenge);
  }
  return res.sendStatus(403);
};

function hasValidSignature(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // signature check is opt-in until the app secret is configured
  const header = req.get("x-hub-signature-256") || "";
  if (!req.rawBody || !header.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex")}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function inboundText(message) {
  if (message?.type === "text") return message.text?.body;
  if (message?.type === "button") return message.button?.text || message.button?.payload;
  if (message?.type === "interactive") return message.interactive?.button_reply?.title;
  return null;
}

export const receiveWebhook = async (req, res) => {
  if (!hasValidSignature(req)) return res.sendStatus(401);

  // Acknowledge immediately — Meta retries anything that isn't a fast 200.
  res.sendStatus(200);

  try {
    for (const entry of req.body?.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};

        for (const status of value.statuses || []) {
          if (!status?.id) continue;
          await NotificationLog.updateOne(
            { providerMessageId: status.id },
            {
              $set: {
                deliveryStatus: status.status,
                deliveryUpdatedAt: status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date(),
                ...(status.status === "failed"
                  ? { status: "failed", reason: status.errors?.[0]?.title || status.errors?.[0]?.message || "delivery_failed" }
                  : {}),
              },
            }
          );
        }

        for (const message of value.messages || []) {
          const phone = normalizePhone(message.from);
          const text = String(inboundText(message) || "").trim().toUpperCase();
          if (!phone || !text) continue;
          if (STOP_WORDS.has(text)) {
            await WhatsAppOptOut.updateOne({ phone }, { $setOnInsert: { phone, source: "reply_stop" } }, { upsert: true });
          } else if (START_WORDS.has(text)) {
            await WhatsAppOptOut.deleteOne({ phone });
          }
        }
      }
    }
  } catch (err) {
    console.error("WhatsApp webhook processing failed:", err.message);
  }
};
