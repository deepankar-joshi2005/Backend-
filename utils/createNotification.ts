import Notification from "../models/Notification";

// Fire-and-forget helper for triggering a notification from any controller
// action (firm onboarded, password reset, ticket reply, etc.) — failures are
// logged only, never allowed to break the action that triggered them.
// userId narrows a "firm" notification down to a single user (see the
// Notification model).
export async function createNotification({
  title,
  message,
  type = "info",
  scope,
  caFirmId = null,
  role = null,
  userId = null,
  link = null,
  createdBy = null,
}: {
  title: string;
  message: string;
  type?: string;
  scope: string;
  caFirmId?: any;
  role?: string | null;
  userId?: any;
  link?: string | null;
  createdBy?: any;
}) {
  try {
    return await Notification.create({
      title,
      message,
      type,
      audience: { scope, caFirmId, role, userId },
      link,
      createdBy,
    });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
    return null;
  }
}
