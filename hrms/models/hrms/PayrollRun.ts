/** @format */

import mongoose, { Schema, Document } from "mongoose";

export type PayrollRunStatus = "Draft" | "PendingOwnerApproval" | "Processing" | "Completed" | "Cancelled";

export interface IPayrollRun extends Document {
  companyId: mongoose.Types.ObjectId;
  month: string; // YYYY-MM
  title: string;
  frequency: string;
  payPeriodStart: string; // YYYY-MM-DD
  payPeriodEnd: string; // YYYY-MM-DD
  payDate?: string; // YYYY-MM-DD
  status: PayrollRunStatus;
  generatedBy: "Company" | "CA";
  // Owner email-approval gate (only used when Company.ownerEmail/ownerPasswordHash
  // are configured) — see payrollApprovalController.ts.
  approvalToken?: string;
  approvalTokenExpiry?: Date;
  ownerApprovedAt?: Date;
  ownerApprovedByEmail?: string;
}

const PayrollRunSchema = new Schema<IPayrollRun>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      default: "Monthly",
    },
    payPeriodStart: {
      type: String,
      required: true,
    },
    payPeriodEnd: {
      type: String,
      required: true,
    },
    payDate: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Draft", "PendingOwnerApproval", "Processing", "Completed", "Cancelled"],
      default: "Draft",
    },
    // Who actually triggered "Run Payroll" for this run — the company's own
    // HRMS user, or CA Firm Admin/Staff acting on the company's behalf via the
    // CA-proxy SSO flow (see internalBridge.ts issueCaProxySsoToken).
    generatedBy: {
      type: String,
      enum: ["Company", "CA"],
      default: "Company",
    },
    approvalToken: {
      type: String,
      default: null,
    },
    approvalTokenExpiry: {
      type: Date,
      default: null,
    },
    ownerApprovedAt: {
      type: Date,
      default: null,
    },
    ownerApprovedByEmail: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

/* 🔒 One run per company per month */
PayrollRunSchema.index({ companyId: 1, month: 1 }, { unique: true });

export default mongoose.model<IPayrollRun>("PayrollRun", PayrollRunSchema);
