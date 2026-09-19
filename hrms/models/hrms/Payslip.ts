/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IPayslip extends Document {
  user: mongoose.Types.ObjectId; // Employee
  payroll: mongoose.Types.ObjectId; // 🔥 Payroll reference (source of truth)
  month: string; // YYYY-MM

  // Earnings snapshot
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

  // Deduction snapshot
  deduction: number; // total
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

  payDays: number;
  lopDays: number;
  payDate?: Date;

  // Attendance breakdown summary (full detail lives on the linked Payroll doc)
  fullDays: number;
  lateFullDays: number;
  halfDays: number;
  lateHalfDays: number;
  absentDays: number;
  paidLeaveDays: number;
  perDayRate: number;
  overtimeHours: number;
  overtimeAmount: number;
  fixedDeductionAmount: number;
  lopDeductionAmount: number;

  // YTD Snapshots
  ytdBasic: number;
  ytdHra: number;
  ytdOtherAllowance: number;
  ytdPf: number;
  ytdProfessionalTax: number;
  ytdTds: number;
  ytdAdvance: number;
  ytdOthers: number;

  netSalary: number;

  status: "Generated" | "Sent" | "Viewed" | "Downloaded";

  pdfPath?: string;
  sentAt?: Date;
  viewedAt?: Date;
  downloadedAt?: Date;
  companyId: mongoose.Types.ObjectId;
}

const PayslipSchema = new Schema<IPayslip>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    payroll: {
      type: Schema.Types.ObjectId,
      ref: "Payroll",
      required: true,
      index: true,
    },

    month: {
      type: String, // YYYY-MM
      required: true,
      index: true,
    },

    /* ===== Earnings ===== */
    basic: {
      type: Number,
      required: true,
    },
    dearnessAllowance: { type: Number, default: 0 },
    retentionAllowance: { type: Number, default: 0 },

    hra: {
      type: Number,
      required: true,
    },
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

    otherAllowance: {
      type: Number,
      default: 0,
    },

    /* ===== Deductions ===== */
    deduction: {
      type: Number,
      default: 0,
    },
    pf: {
      type: Number,
      default: 0,
    },
    voluntaryPf: { type: Number, default: 0 },
    employeeEsi: { type: Number, default: 0 },
    professionalTax: {
      type: Number,
      default: 0,
    },
    labourWelfareFund: { type: Number, default: 0 },
    nps: { type: Number, default: 0 },
    tds: {
      type: Number,
      default: 0,
    },
    otherStatutoryDeduction: { type: Number, default: 0 },
    advance: {
      type: Number,
      default: 0,
    },
    others: {
      type: Number,
      default: 0,
    },

    payDays: {
      type: Number,
      default: 30,
    },
    lopDays: {
      type: Number,
      default: 0,
    },
    payDate: {
      type: Date,
    },

    fullDays: { type: Number, default: 0 },
    lateFullDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    lateHalfDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    perDayRate: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },
    fixedDeductionAmount: { type: Number, default: 0 },
    lopDeductionAmount: { type: Number, default: 0 },

    /* ===== YTD Snapshots ===== */
    ytdBasic: { type: Number, default: 0 },
    ytdHra: { type: Number, default: 0 },
    ytdOtherAllowance: { type: Number, default: 0 },
    ytdPf: { type: Number, default: 0 },
    ytdProfessionalTax: { type: Number, default: 0 },
    ytdTds: { type: Number, default: 0 },
    ytdAdvance: { type: Number, default: 0 },
    ytdOthers: { type: Number, default: 0 },

    /* ===== Final ===== */
    netSalary: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["Generated", "Sent", "Viewed", "Downloaded"],
      default: "Generated",
    },

    pdfPath: {
      type: String,
    },

    sentAt: {
      type: Date,
    },

    viewedAt: {
      type: Date,
    },

    downloadedAt: {
      type: Date,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

/* 🔐 One payslip per employee per month */
PayslipSchema.index({ user: 1, month: 1 }, { unique: true });

export default mongoose.model<IPayslip>("Payslip", PayslipSchema);
