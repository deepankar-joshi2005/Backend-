"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Minimal record for platform-wide aggregate counts only (Super Admin sees
// counts, never individual client data — Role Matrix Section 3 & 5: "Super
// Admin has no default access to any tenant's operational data"). Full HRMS
// onboarding (employees, attendance, payroll) is a later phase; this model
// exists so CA Firm Admin's future "Add Business Client" flow has somewhere
// to write to, and Super Admin's aggregate views have something real to count.
const businessClientSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    caFirmId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    employeeCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // Reference into the separate HRMS service's own database — set once the
    // matching HRMS company/admin is provisioned (see createBusinessClient).
    hrmsCompanyId: { type: String, default: null },
    hrmsCompanyCode: { type: String, default: null },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", default: null },
}, { timestamps: true });
businessClientSchema.index({ caFirmId: 1 });
exports.default = mongoose_1.default.model("BusinessClient", businessClientSchema);
