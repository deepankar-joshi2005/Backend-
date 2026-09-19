"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const messageSchema = new mongoose_1.default.Schema({
    from: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", required: true },
    fromName: { type: String, required: true },
    fromRole: { type: String, required: true },
    text: { type: String, required: true, trim: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
const supportTicketSchema = new mongoose_1.default.Schema({
    caFirmId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    raisedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", required: true },
    subject: { type: String, required: true, trim: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open" },
    messages: [messageSchema],
}, { timestamps: true });
supportTicketSchema.index({ caFirmId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1 });
exports.default = mongoose_1.default.model("SupportTicket", supportTicketSchema);
