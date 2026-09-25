import AuditLog from "../models/AuditLog";

// Fire-and-forget — an audit write failing must never break the action it's
// logging, so errors are swallowed (logged to console only).
export async function writeAuditLog(req, { action, targetType, targetId, targetLabel, metadata = undefined }) {
  try {
    await AuditLog.create({
      actorId: req.user.id,
      actorName: req.currentUser?.name || "Unknown",
      actorRole: req.user.role,
      action,
      targetType,
      targetId,
      targetLabel,
      metadata,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err.message);
  }
}
