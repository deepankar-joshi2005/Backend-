"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = exports.markAllNotificationsRead = exports.markNotificationRead = exports.listMyNotifications = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Notification_1 = __importDefault(require("../models/Notification"));
const CaFirm_1 = __importDefault(require("../models/CaFirm"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
function buildAudienceFilter(user) {
    if (user.role === "super_admin") {
        return { "audience.scope": "super_admin" };
    }
    return {
        $and: [
            {
                $or: [
                    { "audience.scope": "all_firms" },
                    { "audience.scope": "firm", "audience.caFirmId": new mongoose_1.default.Types.ObjectId(user.caFirmId) },
                ],
            },
            { $or: [{ "audience.role": null }, { "audience.role": user.role }] },
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
        if (!user.caFirmId)
            return [];
        filter._id = user.caFirmId;
    }
    const firms = await CaFirm_1.default.find(filter).select("name plan.expiryDate plan.tier");
    return firms.map((firm) => ({
        _id: `expiry-${firm._id}`,
        kind: "alert",
        title: "Licence expiring soon",
        message: user.role === "super_admin"
            ? `${firm.name}'s licence expires on ${firm.plan.expiryDate.toLocaleDateString()}.`
            : `Your licence expires on ${firm.plan.expiryDate.toLocaleDateString()}. Renew to avoid a service interruption.`,
        type: "expiry",
        isRead: false,
        createdAt: firm.plan.expiryDate,
    }));
}
exports.listMyNotifications = (0, catchAsync_1.default)(async (req, res) => {
    const [persisted, alerts] = await Promise.all([
        Notification_1.default.find(buildAudienceFilter(req.user)).sort({ createdAt: -1 }).limit(50),
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
    }));
    const combined = [...alerts, ...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unreadCount = combined.filter((n) => !n.isRead).length;
    res.json({ success: true, data: { notifications: combined, unreadCount } });
});
exports.markNotificationRead = (0, catchAsync_1.default)(async (req, res) => {
    const notification = await Notification_1.default.findById(req.params.id);
    if (!notification)
        throw new ApiError_1.default(404, "Notification not found");
    if (!notification.readBy.some((id) => id.toString() === req.user.id)) {
        notification.readBy.push(req.user.id);
        await notification.save();
    }
    res.json({ success: true, message: "Marked as read" });
});
exports.markAllNotificationsRead = (0, catchAsync_1.default)(async (req, res) => {
    await Notification_1.default.updateMany({ ...buildAudienceFilter(req.user), readBy: { $ne: req.user.id } }, { $push: { readBy: req.user.id } });
    res.json({ success: true, message: "All notifications marked as read" });
});
// Super Admin "Send Notification" — announcements / maintenance notices,
// targeted platform-wide, at one firm, or narrowed further by role.
exports.sendNotification = (0, catchAsync_1.default)(async (req, res) => {
    const { title, message, type, scope, caFirmId, role } = req.body;
    if (scope === "firm" && !caFirmId) {
        throw new ApiError_1.default(400, "caFirmId is required when scope is 'firm'");
    }
    const notification = await Notification_1.default.create({
        title,
        message,
        type: type || "info",
        audience: { scope, caFirmId: scope === "firm" ? caFirmId : null, role: role || null },
        createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: notification, message: "Notification sent" });
});
