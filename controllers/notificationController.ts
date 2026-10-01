import mongoose from "mongoose";
import Notification from "../models/Notification";
import CaFirm from "../models/CaFirm";
import User from "../models/User";
import NotificationLog from "../models/NotificationLog";
import { getSystemSettings } from "../utils/getSystemSettings";
import { currentMonthRange, resolveWhatsAppQuota } from "../utils/notify";
import { isWhatsAppConfigured } from "../utils/whatsapp";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";

function buildAudienceFilter(user) {
  if (user.role === "super_admin") {
    return { "audience.scope": "super_admin" };
  }
  return {
    $and: [
      {
        $or: [
          { "audience.scope": "all_firms" },
          { "audience.scope": "firm", "audience.caFirmId": new mongoose.Types.ObjectId(user.caFirmId) },
        ],
      },
      { $or: [{ "audience.role": null }, { "audience.role": user.role }] },
      { $or: [{ "audience.userId": null }, { "audience.userId": new mongoose.Types.ObjectId(user.id) }] },
    ],
  };
}

// Live, non-dismissible alerts for licences expiring within 7 days — synthesized
// on read (not persisted) so there's nothing to keep in sync as a plan's expiry
// date changes or gets renewed.
async function computeExpiryAlerts(user) {
  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const filter = {
    "plan.status": { $in: ["trial", "active"] },
    "plan.expiryDate": { $gte: now, $lte: sevenDaysOut },
  };
  if (user.role !== "super_admin") {
    if (!user.caFirmId) return [];
    filter._id = user.caFirmId;
  }

  const firms = await CaFirm.find(filter).select("name plan.expiryDate plan.tier");

  return firms.map((firm) => ({
    _id: `expiry-${firm._id}`,
    kind: "alert",
    title: "Licence expiring soon",
    message:
      user.role === "super_admin"
        ? `${firm.name}'s licence expires on ${firm.plan.expiryDate.toLocaleDateString()}.`
        : `Your licence expires on ${firm.plan.expiryDate.toLocaleDateString()}. Renew to avoid a service interruption.`,
    type: "expiry",
    isRead: false,
    createdAt: firm.plan.expiryDate,
    // Super admin reviews the firm from the firms list; a firm's own users don't all
    // have access to the subscription page (staff can't), so send everyone to the
    // dashboard, which already surfaces the renewal prompt near expiry.
    link: user.role === "super_admin" ? "ca-firms" : "",
  }));
}

export const listMyNotifications = catchAsync(async (req, res) => {
  const [persisted, alerts] = await Promise.all([
    Notification.find(buildAudienceFilter(req.user)).sort({ createdAt: -1 }).limit(50),
    computeExpiryAlerts(req.user),
  ]);

  const notifications = persisted.map((n) => ({
    _id: n._id,
    kind: "notification",
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.readBy.some((id) => id.toString() === req.user.id),
    createdAt: n.createdAt,
    link: n.link || null,
  }));

  const combined = [...alerts, ...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadCount = combined.filter((n) => !n.isRead).length;

  res.json({ success: true, data: { notifications: combined, unreadCount } });
});

export const markNotificationRead = catchAsync(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) throw new ApiError(404, "Notification not found");

  if (!notification.readBy.some((id) => id.toString() === req.user.id)) {
    notification.readBy.push(req.user.id);
    await notification.save();
  }

  res.json({ success: true, message: "Marked as read" });
});

export const markAllNotificationsRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { ...buildAudienceFilter(req.user), readBy: { $ne: req.user.id } },
    { $push: { readBy: req.user.id } }
  );
  res.json({ success: true, message: "All notifications marked as read" });
});

// Super Admin "Send Notification" — announcements / maintenance notices,
// targeted platform-wide, at one firm, or narrowed further by role.
export const sendNotification = catchAsync(async (req, res) => {
  const { title, message, type, scope, caFirmId, role, link } = req.body;

  if (scope === "firm" && !caFirmId) {
    throw new ApiError(400, "caFirmId is required when scope is 'firm'");
  }

  const notification = await Notification.create({
    title,
    message,
    type: type || "info",
    audience: { scope, caFirmId: scope === "firm" ? caFirmId : null, role: role || null },
    link: link || null,
    createdBy: req.user.id,
  });

  res.status(201).json({ success: true, data: notification, message: "Notification sent" });
});

// ── Channel preferences (Module Scope doc, Section 6.1: opt-out per channel) ──

export const getMyNotificationPreferences = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select("notificationPreferences");
  if (!user) throw new ApiError(404, "User not found");
  res.json({
    success: true,
    data: {
      preferences: {
        inApp: user.notificationPreferences?.inApp !== false,
        email: user.notificationPreferences?.email !== false,
        whatsapp: user.notificationPreferences?.whatsapp !== false,
      },
      whatsappConfigured: isWhatsAppConfigured(),
    },
  });
});

export const updateMyNotificationPreferences = catchAsync(async (req, res) => {
  const update = {};
  for (const channel of ["inApp", "email", "whatsapp"]) {
    if (typeof req.body[channel] === "boolean") update[`notificationPreferences.${channel}`] = req.body[channel];
  }
  const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true }).select("notificationPreferences");
  if (!user) throw new ApiError(404, "User not found");
  res.json({ success: true, data: { preferences: user.notificationPreferences }, message: "Notification preferences saved" });
});

// ── WhatsApp usage vs. included quota (Multi-Tenancy & Licensing doc, Sections 5/6) ──

async function usageForFirms(firms, settings) {
  const { start, end } = currentMonthRange();
  const counts = await NotificationLog.aggregate([
    {
      $match: {
        channel: "whatsapp",
        status: "sent",
        createdAt: { $gte: start, $lt: end },
        caFirmId: { $in: firms.map((f) => f._id) },
      },
    },
    { $group: { _id: "$caFirmId", sent: { $sum: 1 } } },
  ]);
  const sentByFirm = new Map(counts.map((c) => [c._id.toString(), c.sent]));

  return firms.map((firm) => {
    const sent = sentByFirm.get(firm._id.toString()) || 0;
    const quota = resolveWhatsAppQuota(firm, settings);
    const overage = quota === null ? 0 : Math.max(0, sent - quota);
    return {
      caFirmId: firm._id,
      firmName: firm.name,
      tier: firm.plan?.tier,
      sent,
      quota,
      overage,
      overageAmount: overage * (settings.whatsappOverageRate || 0),
    };
  });
}

export const getWhatsAppUsage = catchAsync(async (req, res) => {
  const settings = await getSystemSettings();
  const { start, end } = currentMonthRange();
  const meta = {
    whatsappConfigured: isWhatsAppConfigured(),
    periodStart: start,
    periodEnd: end,
    overageRate: settings.whatsappOverageRate,
    currency: settings.currency,
  };

  if (req.user.role === "super_admin") {
    const firms = await CaFirm.find().select("name plan").sort({ name: 1 }).lean();
    const rows = await usageForFirms(firms, settings);
    return res.json({ success: true, data: { ...meta, firms: rows } });
  }

  const firm = await CaFirm.findById(req.user.caFirmId).select("name plan").lean();
  if (!firm) throw new ApiError(404, "CA firm not found");
  const [row] = await usageForFirms([firm], settings);
  res.json({ success: true, data: { ...meta, ...row } });
});
