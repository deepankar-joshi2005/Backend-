"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
// Fire-and-forget — an audit write failing must never break the action it's
// logging, so errors are swallowed (logged to console only).
async function writeAuditLog(req, { action, targetType, targetId, targetLabel, metadata }) {
    var _a;
    try {
        await AuditLog_1.default.create({
            actorId: req.user.id,
            actorName: ((_a = req.currentUser) === null || _a === void 0 ? void 0 : _a.name) || "Unknown",
            actorRole: req.user.role,
            action,
            targetType,
            targetId,
            targetLabel,
            metadata,
        });
    }
    catch (err) {
        console.error("Failed to write audit log:", err.message);
    }
}
