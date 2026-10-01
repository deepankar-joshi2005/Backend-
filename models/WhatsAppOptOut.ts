import mongoose from "mongoose";

// Platform-wide WhatsApp opt-out list keyed by normalized phone number (digits
// only, with country code). Filled automatically when someone replies STOP to
// any of our WhatsApp messages (see whatsappWebhookController) and cleared when
// they reply START — Module Scope doc, Section 6.1: "Notification preference
// management (opt-out per channel) — needed for consent/compliance with WhatsApp
// Business messaging policies". Checked before every WhatsApp send, so it covers
// leads, clients and employees alike, regardless of which module messaged them.
const whatsAppOptOutSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    source: { type: String, enum: ["reply_stop", "manual"], default: "reply_stop" },
  },
  { timestamps: true }
);

export default mongoose.model("WhatsAppOptOut", whatsAppOptOutSchema);
