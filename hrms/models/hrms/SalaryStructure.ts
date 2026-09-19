/** @format */

import mongoose, { Schema, Document } from "mongoose";

// Earning/deduction component list mirrors the CA-side ClientPayrollSettings
// DEFAULT_EARNING_COMPONENTS / DEFAULT_DEDUCTION_COMPONENTS (CA-Backend/models/ClientPayrollSettings.ts)
// so HRMS's own salary structure can express the same components CAs manage
// for their outsourced-payroll business clients.
export interface ISalaryStructure extends Document {
  employee: mongoose.Types.ObjectId;

  // Earnings
  basic: number;
  dearnessAllowance: number;
  retentionAllowance: number;
  hra: number;
  conveyanceAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  lta: number;
  specialAllowance: number;
  shiftAllowance: number;
  nightShiftAllowance: number;
  attendanceAllowance: number;
  productionIncentive: number;
  productivityIncentive: number;
  overtimeAllowance: number;
  performanceIncentive: number;
  salesIncentive: number;
  bonus: number;
  arrears: number;
  leaveEncashmentAllowance: number;
  otherAllowance: number;

  // Deductions
  pf: number;
  voluntaryPf: number;
  employeeEsi: number;
  professionalTax: number;
  labourWelfareFund: number;
  nps: number;
  tds: number;
  otherStatutoryDeduction: number;
  advance: number;
  others: number;

  companyId: mongoose.Types.ObjectId;
}

const SalaryStructureSchema = new Schema<ISalaryStructure>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Earnings
    basic: { type: Number, default: 0 },
    dearnessAllowance: { type: Number, default: 0 },
    retentionAllowance: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    conveyanceAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    lta: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    shiftAllowance: { type: Number, default: 0 },
    nightShiftAllowance: { type: Number, default: 0 },
    attendanceAllowance: { type: Number, default: 0 },
    productionIncentive: { type: Number, default: 0 },
    productivityIncentive: { type: Number, default: 0 },
    overtimeAllowance: { type: Number, default: 0 },
    performanceIncentive: { type: Number, default: 0 },
    salesIncentive: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    arrears: { type: Number, default: 0 },
    leaveEncashmentAllowance: { type: Number, default: 0 },
    otherAllowance: { type: Number, default: 0 },

    // Deductions
    pf: { type: Number, default: 0 },
    voluntaryPf: { type: Number, default: 0 },
    employeeEsi: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    labourWelfareFund: { type: Number, default: 0 },
    nps: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    otherStatutoryDeduction: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    others: { type: Number, default: 0 },

    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const EARNING_FIELDS = [
  "basic",
  "dearnessAllowance",
  "retentionAllowance",
  "hra",
  "conveyanceAllowance",
  "transportAllowance",
  "medicalAllowance",
  "lta",
  "specialAllowance",
  "shiftAllowance",
  "nightShiftAllowance",
  "attendanceAllowance",
  "productionIncentive",
  "productivityIncentive",
  "overtimeAllowance",
  "performanceIncentive",
  "salesIncentive",
  "bonus",
  "arrears",
  "leaveEncashmentAllowance",
  "otherAllowance",
] as const;

export const DEDUCTION_FIELDS = [
  "pf",
  "voluntaryPf",
  "employeeEsi",
  "professionalTax",
  "labourWelfareFund",
  "nps",
  "tds",
  "otherStatutoryDeduction",
  "advance",
  "others",
] as const;

export default mongoose.model<ISalaryStructure>(
  "SalaryStructure",
  SalaryStructureSchema
);
