import mongoose from "mongoose";

// In-app (bell) notifications for HRMS users — one row per recipient. Written
// by utils/hrmsNotify.ts alongside the email/WhatsApp copies of the same event
// (Module Scope doc, Section 6.1: "Notification engine (in-app + email +
// WhatsApp)"). Always scoped to the recipient's own company, so a business
// client's notifications can never surface for another business client.
const hrmsNotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    event: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ["info", "success", "warning", "error"], default: "info" },
    // Absolute HRMS route (e.g. "/hrms/employee/leave/apply") opened on click.
    link: { type: String, default: null, trim: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

hrmsNotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("HrmsNotification", hrmsNotificationSchema);
