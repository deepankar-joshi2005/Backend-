import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "ca_firm.created", "ca_firm.suspended"
    targetType: { type: String, required: true }, // e.g. "CaFirm", "User", "SystemSettings"
    targetId: { type: mongoose.Schema.Types.ObjectId },
    targetLabel: { type: String }, // human-readable, e.g. the firm's name
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
