import Notification from "../models/Notification";

// Fire-and-forget helper for triggering a notification from any controller
// action (firm onboarded, password reset, ticket reply, etc.) — failures are
// logged only, never allowed to break the action that triggered them.
export async function createNotification({ title, message, type = "info", scope, caFirmId = null, role = null, createdBy = null }) {
  try {
    return await Notification.create({
      title,
      message,
      type,
      audience: { scope, caFirmId, role },
      createdBy,
    });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
    return null;
  }
}
