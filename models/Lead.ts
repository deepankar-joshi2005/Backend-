import mongoose from "mongoose";

// One record spans the whole CRM lifecycle — a "lead" becomes a "client" via a
// status change (Module Scope doc, Section 3: "Client conversion — status change
// with basic history log"), not a separate entity.
export const LEAD_TYPES = ["individual", "business", "startup", "company", "existing_client_referral"];
export const BUSINESS_TYPES = ["proprietorship", "partnership", "llp", "private_limited", "other"];
export const INTERESTED_SERVICES = [
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
export const LEAD_SOURCES = [
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
export const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"];
export const LEAD_PRIORITIES = ["low", "medium", "high"];
export const FOLLOWUP_TYPES = ["call", "email", "whatsapp", "meeting"];

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: LEAD_STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", required: true },
    changedByName: { type: String, required: true },
    // e.g. a disqualify reason when moving to "lost".
    note: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const leadSchema = new mongoose.Schema(
  {
    // 1. Lead / person details
    name: { type: String, required: true, trim: true },
    leadType: { type: String, enum: LEAD_TYPES, required: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    alternatePhone: { type: String, trim: true },

    // 2. Business details — only meaningful when leadType is business/company (enforced
    // at the validator level, since it's conditional on leadType).
    company: { type: String, trim: true },
    businessType: { type: String, enum: BUSINESS_TYPES },
    industry: { type: String, trim: true },
    city: { type: String, trim: true },

    // 3. Service required — a lead can want more than one service at once.
    interestedServices: { type: [{ type: String, enum: INTERESTED_SERVICES }], default: [] },

    // 4. Source
    source: { type: String, enum: LEAD_SOURCES, required: true },

    // 5. Status — always starts at "new"; never settable on create.
    status: { type: String, enum: LEAD_STATUSES, default: "new" },

    // 6. Assignment — per Role Matrix Section 4.2, only CA Firm Admin can set/change this.
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", default: null },

    // 7. Qualification details
    estimatedValue: { type: Number, default: null },
    priority: { type: String, enum: LEAD_PRIORITIES, default: "medium" },
    expectedClosingDate: { type: Date, default: null },

    // 8. Follow-up — set later via a dedicated "Schedule Follow-up" action, not at
    // lead creation.
    followUpDate: { type: Date, default: null },
    followUpType: { type: String, enum: FOLLOWUP_TYPES, default: null },
    followUpNote: { type: String, trim: true },

    // 9. Notes — a static description, separate from the timestamped activity log below.
    description: { type: String, trim: true },

    caFirmId: { type: mongoose.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    notes: [noteSchema],
    statusHistory: [statusHistorySchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", default: null },
    // Set once this client is also provisioned into HRMS as a Business Client —
    // lets the CRM "Clients" tab show HRMS status without a second lookup.
    businessClientId: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessClient", default: null },
  },
  { timestamps: true }
);

leadSchema.index({ caFirmId: 1, status: 1 });
leadSchema.index({ caFirmId: 1, assignedTo: 1 });

export default mongoose.model("Lead", leadSchema);
