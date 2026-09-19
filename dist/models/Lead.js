"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOLLOWUP_TYPES = exports.LEAD_PRIORITIES = exports.LEAD_STATUSES = exports.LEAD_SOURCES = exports.INTERESTED_SERVICES = exports.BUSINESS_TYPES = exports.LEAD_TYPES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// One record spans the whole CRM lifecycle — a "lead" becomes a "client" via a
// status change (Module Scope doc, Section 3: "Client conversion — status change
// with basic history log"), not a separate entity.
exports.LEAD_TYPES = ["individual", "business", "startup", "company", "existing_client_referral"];
exports.BUSINESS_TYPES = ["proprietorship", "partnership", "llp", "private_limited", "other"];
exports.INTERESTED_SERVICES = [
    "gst_registration",
    "gst_filing",
    "income_tax_return",
    "tax_consultation",
    "accounting_bookkeeping",
    "roc_compliance",
    "audit",
    "tds",
    "financial_statements",
    "loan_advisory",
    "other",
];
exports.LEAD_SOURCES = [
    "website",
    "phone_call",
    "whatsapp",
    "email",
    "referral",
    "social_media",
    "advertisement",
    "walk_in",
    "other",
];
exports.LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"];
exports.LEAD_PRIORITIES = ["low", "medium", "high"];
exports.FOLLOWUP_TYPES = ["call", "email", "whatsapp", "meeting"];
const noteSchema = new mongoose_1.default.Schema({
    text: { type: String, required: true, trim: true },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", required: true },
    createdByName: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
const statusHistorySchema = new mongoose_1.default.Schema({
    status: { type: String, enum: exports.LEAD_STATUSES, required: true },
    changedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", required: true },
    changedByName: { type: String, required: true },
    // e.g. a disqualify reason when moving to "lost".
    note: { type: String, trim: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
const leadSchema = new mongoose_1.default.Schema({
    // 1. Lead / person details
    name: { type: String, required: true, trim: true },
    leadType: { type: String, enum: exports.LEAD_TYPES, required: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    alternatePhone: { type: String, trim: true },
    // 2. Business details — only meaningful when leadType is business/company (enforced
    // at the validator level, since it's conditional on leadType).
    company: { type: String, trim: true },
    businessType: { type: String, enum: exports.BUSINESS_TYPES },
    industry: { type: String, trim: true },
    city: { type: String, trim: true },
    // 3. Service required — a lead can want more than one service at once.
    interestedServices: { type: [{ type: String, enum: exports.INTERESTED_SERVICES }], default: [] },
    // 4. Source
    source: { type: String, enum: exports.LEAD_SOURCES, required: true },
    // 5. Status — always starts at "new"; never settable on create.
    status: { type: String, enum: exports.LEAD_STATUSES, default: "new" },
    // 6. Assignment — per Role Matrix Section 4.2, only CA Firm Admin can set/change this.
    assignedTo: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", default: null },
    // 7. Qualification details
    estimatedValue: { type: Number, default: null },
    priority: { type: String, enum: exports.LEAD_PRIORITIES, default: "medium" },
    expectedClosingDate: { type: Date, default: null },
    // 8. Follow-up — set later via a dedicated "Schedule Follow-up" action, not at
    // lead creation.
    followUpDate: { type: Date, default: null },
    followUpType: { type: String, enum: exports.FOLLOWUP_TYPES, default: null },
    followUpNote: { type: String, trim: true },
    // 9. Notes — a static description, separate from the timestamped activity log below.
    description: { type: String, trim: true },
    caFirmId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    notes: [noteSchema],
    statusHistory: [statusHistorySchema],
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", default: null },
}, { timestamps: true });
leadSchema.index({ caFirmId: 1, status: 1 });
leadSchema.index({ caFirmId: 1, assignedTo: 1 });
exports.default = mongoose_1.default.model("Lead", leadSchema);
