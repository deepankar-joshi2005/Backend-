import mongoose from "mongoose";

// Per Module Scope doc, Section 4: predefined "templates" (GST/TDS/ROC/...) are just
// title/category/recurrence presets the create-task form offers — there's no separate
// template collection since each period's task is still created manually (that's what
// "manual" compliance tool means per the same doc: no auto-filing, no auto-generated
// recurring instances).
export const COMPLIANCE_CATEGORIES = ["gst", "tds", "roc", "income_tax", "other"];
export const COMPLIANCE_RECURRENCE = ["one_time", "monthly", "quarterly", "annual"];
export const COMPLIANCE_STATUSES = ["pending", "in_progress", "done"];

const documentItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
    // Set when this item was created via a real file upload (uploadTaskDocument)
    // rather than a plain manual checklist entry — both share one list.
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const complianceTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: COMPLIANCE_CATEGORIES, default: "other" },
    recurrence: { type: String, enum: COMPLIANCE_RECURRENCE, default: "one_time" },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: COMPLIANCE_STATUSES, default: "pending" },
    // The client this task is for — a converted (or in-progress) CRM record.
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", default: null },
    documents: [documentItemSchema],
    notes: [noteSchema],
    caFirmId: { type: mongoose.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", default: null },
  },
  { timestamps: true }
);

complianceTaskSchema.index({ caFirmId: 1, status: 1 });
complianceTaskSchema.index({ caFirmId: 1, assignedTo: 1 });
complianceTaskSchema.index({ caFirmId: 1, dueDate: 1 });

export default mongoose.model("ComplianceTask", complianceTaskSchema);
