import mongoose from "mongoose";

// audience.scope decides who a notification is visible to:
//  - "super_admin": only the platform owner
//  - "all_firms":   every user across every CA firm (optionally narrowed by role)
//  - "firm":        every user in one specific CA firm (optionally narrowed by role)
const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["info", "warning", "expiry", "maintenance", "ticket", "system"],
      default: "info",
    },
    audience: {
      scope: { type: String, enum: ["super_admin", "all_firms", "firm"], required: true },
      caFirmId: { type: mongoose.Schema.Types.ObjectId, ref: "CaFirm", default: null },
      role: { type: String, default: null },
    },
    // Path relative to the viewing user's role-base (e.g. "support", "ca-firms"),
    // resolved on the frontend as `${basePath}/${link}` when the notification is clicked.
    // null/"" means "just go to the dashboard".
    link: { type: String, default: null, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", default: null },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "CaUser" }],
  },
  { timestamps: true }
);

notificationSchema.index({ "audience.scope": 1, "audience.caFirmId": 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
