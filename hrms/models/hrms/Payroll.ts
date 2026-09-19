/** @format */

import mongoose, { Schema, Document } from "mongoose";

export type PayrollStatus = "Draft" | "Processed" | "Paid" | "Rejected";

export interface IPayroll extends Document {
  employee: mongoose.Types.ObjectId;
  month: string; // YYYY-MM
  gross: number;
  deduction: number;
  net: number;
  status: PayrollStatus;
  payDays: number;
  lopDays: number;
  rejectReason?: string;
  rejectedAt?: Date;
  companyId: mongoose.Types.ObjectId;

  // Attendance-policy-driven breakdown
  fullDays: number;
  lateFullDays: number;
  halfDays: number;
  lateHalfDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  holidayDays: number;
  weeklyOffDays: number;
  lateOccurrences: number;
  lateAggregateHalfDayDeductions: number;
  perDayRate: number;
  overtimeHours: number;
  overtimeAmount: number;
  encashmentBonus: number;
  fixedDeductionAmount: number;
  lopDeductionAmount: number;
  dailyBreakdown: {
    date: string;
    status: string;
    lateByMinutes: number;
    workedHours: number;
    reason: string;
  }[];
}

const PayrollSchema = new Schema<IPayroll>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    month: {
      type: String,
      required: true,
    },

    gross: {
      type: Number,
      required: true,
    },

    deduction: {
      type: Number,
      required: true,
    },

    net: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["Draft", "Processed", "Paid", "Rejected"],
      default: "Draft",
    },
    payDays: {
      type: Number,
      default: 0,
    },
    lopDays: {
      type: Number,
      default: 0,
    },

    rejectReason: {
      type: String,
    },

    rejectedAt: {
      type: Date,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    fullDays: { type: Number, default: 0 },
    lateFullDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    lateHalfDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    holidayDays: { type: Number, default: 0 },
    weeklyOffDays: { type: Number, default: 0 },
    lateOccurrences: { type: Number, default: 0 },
    lateAggregateHalfDayDeductions: { type: Number, default: 0 },
    perDayRate: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },
    encashmentBonus: { type: Number, default: 0 },
    fixedDeductionAmount: { type: Number, default: 0 },
    lopDeductionAmount: { type: Number, default: 0 },
    dailyBreakdown: {
      type: [
        {
          date: String,
          status: String,
          lateByMinutes: Number,
          workedHours: Number,
          reason: String,
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

/* 🔒 One payroll per employee per month */
PayrollSchema.index({ employee: 1, month: 1 }, { unique: true });

export default mongoose.model<IPayroll>("Payroll", PayrollSchema);
