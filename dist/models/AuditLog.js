"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const auditLogSchema = new mongoose_1.default.Schema({
    actorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "ca_firm.created", "ca_firm.suspended"
    targetType: { type: String, required: true }, // e.g. "CaFirm", "User", "SystemSettings"
    targetId: { type: mongoose_1.default.Schema.Types.ObjectId },
    targetLabel: { type: String }, // human-readable, e.g. the firm's name
    metadata: { type: mongoose_1.default.Schema.Types.Mixed },
}, { timestamps: true });
auditLogSchema.index({ createdAt: -1 });
exports.default = mongoose_1.default.model("AuditLog", auditLogSchema);
