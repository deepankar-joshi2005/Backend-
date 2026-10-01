import { Response } from "express";
import HrmsNotification from "../../models/hrms/HrmsNotification";
import User from "../../models/User";
import { AuthRequest } from "../../middleware/auth";
import { isWhatsAppConfigured } from "../../../utils/whatsapp";

// The signed-in HRMS user's own bell notifications (written by
// utils/hrmsNotify.ts) and their per-channel preferences — Module Scope doc,
// Section 6.1 (in-app notifications + opt-out per channel).

export const listMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const recipient = req.user._id;
    const [notifications, unreadCount] = await Promise.all([
      HrmsNotification.find({ recipient }).sort({ createdAt: -1 }).limit(50).lean(),
      HrmsNotification.countDocuments({ recipient, isRead: false }),
    ]);
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to load notifications" });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await HrmsNotification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update notification" });
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    await HrmsNotification.updateMany({ recipient: req.user._id, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update notifications" });
  }
};

function currentPreferences(user: any) {
  const prefs = user?.notificationPreferences || {};
  return { inApp: prefs.inApp !== false, email: prefs.email !== false, whatsapp: prefs.whatsapp !== false };
}

export const getMyPreferences = async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: { preferences: currentPreferences(req.user), whatsappConfigured: isWhatsAppConfigured(), hasMobile: !!req.user.mobile },
  });
};

export const updateMyPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const update: Record<string, boolean> = {};
    for (const channel of ["inApp", "email", "whatsapp"]) {
      if (typeof req.body?.[channel] === "boolean") update[`notificationPreferences.${channel}`] = req.body[channel];
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select("notificationPreferences");
    res.json({ success: true, data: { preferences: currentPreferences(user) }, message: "Notification preferences saved" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to save preferences" });
  }
};
