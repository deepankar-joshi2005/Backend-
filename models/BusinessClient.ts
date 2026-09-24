import mongoose from "mongoose";

// Minimal record for platform-wide aggregate counts only (Super Admin sees
// counts, never individual client data — Role Matrix Section 3 & 5: "Super
// Admin has no default access to any tenant's operational data"). Full HRMS
// onboarding (employees, attendance, payroll) is a later phase; this model
// exists so CA Firm Admin's future "Add Business Client" flow has somewhere
// to write to, and Super Admin's aggregate views have something real to count.
export const CLIENT_TYPES = ["individual", "proprietorship", "partnership", "llp", "company", "other"];
export const SERVICES = ["gst", "income_tax", "tds", "accounting", "roc_compliance", "audit", "payroll", "other"];

const businessClientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    clientType: { type: String, enum: CLIENT_TYPES, default: "other" },
    pan: { type: String, trim: true, uppercase: true },
    gstin: { type: String, trim: true, uppercase: true },
    industry: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    services: { type: [String], enum: SERVICES, default: [] },
    // Whether this Business Client gets an HRMS admin login at all — set once at
    // onboarding time (see createBusinessClient); not changed by later edits.
    useHrms: { type: Boolean, default: true },
    caFirmId: { type: mongoose.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    employeeCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // Reference into the separate HRMS service's own database — set once the
    // matching HRMS company/admin is provisioned (see createBusinessClient).
    hrmsCompanyId: { type: String, default: null },
    hrmsCompanyCode: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", default: null },
    // Every Business Client is backed by exactly one Lead record — either an
    // existing converted lead (chosen via "Provision to HRMS") or one created
    // automatically alongside it — so Compliance Tool (which only ever looks
    // at Lead records) can track filings for every Business Client too.
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    // Public self-onboarding link the Business Client shares with their own
    // employees (mainly relevant when useHrms: false — HRMS clients manage
    // employees inside HRMS itself). Generated once at creation; the link is
    // live immediately — each employee "authenticates" by entering their own
    // Employee ID (see publicEmployeeFormController.ts), not a shared
    // company-wide password. See publicBusinessClientRoutes.ts.
    employeeFormToken: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

businessClientSchema.index({ caFirmId: 1 });

export default mongoose.model("BusinessClient", businessClientSchema);
