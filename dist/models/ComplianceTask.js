"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPLIANCE_STATUSES = exports.COMPLIANCE_RECURRENCE = exports.COMPLIANCE_CATEGORIES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Per Module Scope doc, Section 4: predefined "templates" (GST/TDS/ROC/...) are just
// title/category/recurrence presets the create-task form offers — there's no separate
// template collection since each period's task is still created manually (that's what
// "manual" compliance tool means per the same doc: no auto-filing, no auto-generated
// recurring instances).
exports.COMPLIANCE_CATEGORIES = ["gst", "tds", "roc", "income_tax", "other"];
exports.COMPLIANCE_RECURRENCE = ["one_time", "monthly", "quarterly", "annual"];
exports.COMPLIANCE_STATUSES = ["pending", "in_progress", "done"];
const documentItemSchema = new mongoose_1.default.Schema({
    label: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
}, { _id: false });
const noteSchema = new mongoose_1.default.Schema({
    text: { type: String, required: true, trim: true },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", required: true },
    createdByName: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
const complianceTaskSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: exports.COMPLIANCE_CATEGORIES, default: "other" },
    recurrence: { type: String, enum: exports.COMPLIANCE_RECURRENCE, default: "one_time" },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: exports.COMPLIANCE_STATUSES, default: "pending" },
    // The client this task is for — a converted (or in-progress) CRM record.
    clientId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Lead", required: true },
    assignedTo: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", default: null },
    documents: [documentItemSchema],
    notes: [noteSchema],
    caFirmId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", default: null },
}, { timestamps: true });
complianceTaskSchema.index({ caFirmId: 1, status: 1 });
complianceTaskSchema.index({ caFirmId: 1, assignedTo: 1 });
complianceTaskSchema.index({ caFirmId: 1, dueDate: 1 });
exports.default = mongoose_1.default.model("ComplianceTask", complianceTaskSchema);
