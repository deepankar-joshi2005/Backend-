import mongoose from "mongoose";

// One row per outbound email/WhatsApp attempt from the notification engine
// (utils/notify.ts + hrms/utils/hrmsNotify.ts). Serves three purposes:
//  - audit trail of what was sent to whom, and why something was skipped;
//  - WhatsApp usage metering per CA firm per month — Multi-Tenancy & Licensing
//    doc, Sections 5/6: each tier has an included monthly WhatsApp quota and
//    usage beyond it is billed pay-as-you-go to the CA firm;
//  - delivery tracking — Meta's status webhook (whatsappWebhookController)
//    updates deliveryStatus by providerMessageId.
// HRMS messages carry the parent CA firm's id too (Company.caFirmId), since the
// CA firm is the paying tenant for its business clients' WhatsApp usage.
export const NOTIFICATION_CHANNELS = ["email", "whatsapp"];
export const NOTIFICATION_LOG_STATUSES = ["sent", "failed", "skipped"];

const notificationLogSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    event: { type: String, required: true, trim: true },
    status: { type: String, enum: NOTIFICATION_LOG_STATUSES, required: true },
    // Why a message was skipped/failed (e.g. "whatsapp_not_configured",
    // "recipient_opted_out", "firm_licence_lapsed", provider error text).
    reason: { type: String, default: null },
    to: { type: String, default: null, trim: true },
    recipientName: { type: String, default: null, trim: true },
    caFirmId: { type: mongoose.Schema.Types.ObjectId, ref: "CaFirm", default: null },
    hrmsCompanyId: { type: mongoose.Schema.Types.ObjectId, default: null },
    template: { type: String, default: null },
    providerMessageId: { type: String, default: null },
    // Meta delivery status from the webhook: sent → delivered → read, or failed.
    deliveryStatus: { type: String, default: null },
    deliveryUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationLogSchema.index({ caFirmId: 1, channel: 1, status: 1, createdAt: -1 });
notificationLogSchema.index({ providerMessageId: 1 }, { sparse: true });

export default mongoose.model("NotificationLog", notificationLogSchema);
