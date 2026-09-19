"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Singleton document (a single row holds platform-wide settings).
const systemSettingsSchema = new mongoose_1.default.Schema({
    platformName: { type: String, default: "Praxis" },
    supportEmail: { type: String, default: "" },
    maintenanceMode: { type: Boolean, default: false },
    // Subscription defaults — edited from the Super Admin Settings page.
    defaultTrialDays: { type: Number, default: 14 },
    starterPrice: { type: Number, default: 1999 },
    growthPrice: { type: Number, default: 4999 },
    currency: { type: String, default: "INR" },
    updatedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", default: null },
}, { timestamps: true });
exports.default = mongoose_1.default.model("SystemSettings", systemSettingsSchema);
