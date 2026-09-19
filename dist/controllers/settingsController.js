"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const getSystemSettings_1 = require("../utils/getSystemSettings");
const writeAuditLog_1 = require("../utils/writeAuditLog");
exports.getSettings = (0, catchAsync_1.default)(async (req, res) => {
    const settings = await (0, getSystemSettings_1.getSystemSettings)();
    res.json({ success: true, data: settings });
});
exports.updateSettings = (0, catchAsync_1.default)(async (req, res) => {
    const settings = await (0, getSystemSettings_1.getSystemSettings)();
    Object.assign(settings, req.body, { updatedBy: req.user.id });
    await settings.save();
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: "settings.updated",
        targetType: "SystemSettings",
        targetId: settings._id,
        metadata: req.body,
    });
    res.json({ success: true, data: settings, message: "Platform settings updated" });
});
