"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
const Notification_1 = __importDefault(require("../models/Notification"));
// Fire-and-forget helper for triggering a notification from any controller
// action (firm onboarded, password reset, ticket reply, etc.) — failures are
// logged only, never allowed to break the action that triggered them.
async function createNotification({ title, message, type = "info", scope, caFirmId = null, role = null, createdBy = null }) {
    try {
        return await Notification_1.default.create({
            title,
            message,
            type,
            audience: { scope, caFirmId, role },
            createdBy,
        });
    }
    catch (err) {
        console.error("Failed to create notification:", err.message);
        return null;
    }
}
