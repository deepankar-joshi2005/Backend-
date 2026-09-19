"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// audience.scope decides who a notification is visible to:
//  - "super_admin": only the platform owner
//  - "all_firms":   every user across every CA firm (optionally narrowed by role)
//  - "firm":        every user in one specific CA firm (optionally narrowed by role)
const notificationSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ["info", "warning", "expiry", "maintenance", "ticket", "system"],
        default: "info",
    },
    audience: {
        scope: { type: String, enum: ["super_admin", "all_firms", "firm"], required: true },
        caFirmId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaFirm", default: null },
        role: { type: String, default: null },
    },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", default: null },
    readBy: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser" }],
}, { timestamps: true });
notificationSchema.index({ "audience.scope": 1, "audience.caFirmId": 1, createdAt: -1 });
exports.default = mongoose_1.default.model("Notification", notificationSchema);
