import mongoose from "mongoose";

// Lightweight employee master for non-HRMS Business Clients (useHrms: false)
// — they have no HRMS User records at all, so this is the only place their
// employees exist. Matched across monthly Excel uploads by employeeCode.
const clientEmployeeSchema = new mongoose.Schema(
  {
    businessClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessClient",
      required: true,
      index: true,
    },
    // System-generated (see utils/employeeIdGenerator.ts) — clients no longer
    // supply this in the Excel import, so it can't be trusted as human input.
    employeeCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    // Lowercased/trimmed name — since Excel imports no longer carry a stable
    // employee code, this is how the same employee is matched across months.
    nameKey: { type: String, required: true, index: true },
    costCenter: { type: String, trim: true },
    designation: { type: String, trim: true },
    dateOfJoining: { type: Date },
    isActive: { type: Boolean, default: true },

    // Self-submitted via the public employee onboarding form, or entered
    // manually by the Business Client Admin — never touched by the Excel
    // import flow above.
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    fatherOrHusbandName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    address: { type: String, trim: true },
    pan: { type: String, trim: true, uppercase: true },
    bankAccountNumber: { type: String, trim: true },
    bankIfsc: { type: String, trim: true, uppercase: true },
    bankName: { type: String, trim: true },
    accountHolderName: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    source: { type: String, enum: ["self_registered", "excel_import", "manual"], default: "manual" },
    // Set when the employee has completed the self-service form via their own
    // Employee ID (see publicEmployeeFormController.ts) — lets CA/staff and
    // the Business Client Admin see who's actually filled in their details.
    selfServiceSubmittedAt: { type: Date },
  },
  { timestamps: true }
);

clientEmployeeSchema.index({ businessClientId: 1, employeeCode: 1 }, { unique: true });

export default mongoose.model("ClientEmployee", clientEmployeeSchema);
