/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IAttendancePolicy extends Document {
  companyId: mongoose.Types.ObjectId;
  graceMinutes: number;
  lateMarkAfterMinutes: number;
  minHoursFullDay: number;
  minHoursHalfDay: number;
  earlyExitBufferMinutes: number;
  lateCountForHalfDay: number;
  overtimeEnabled: boolean;
  overtimeAfterHours: number;
  overtimeType: "Paid" | "Compensatory" | "None";
  overtimeRateType: "FIXED_PER_HOUR" | "MULTIPLIER_OF_HOURLY";
  overtimeRateValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const attendancePolicySchema = new Schema<IAttendancePolicy>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true, // one policy per company
    },
    graceMinutes: { type: Number, default: 10 },
    lateMarkAfterMinutes: { type: Number, default: 15 },
    minHoursFullDay: { type: Number, default: 8 },
    minHoursHalfDay: { type: Number, default: 4 },
    earlyExitBufferMinutes: { type: Number, default: 30 },
    lateCountForHalfDay: { type: Number, default: 3 },
    overtimeEnabled: { type: Boolean, default: true },
    overtimeAfterHours: { type: Number, default: 8 },
    overtimeType: {
      type: String,
      enum: ["Paid", "Compensatory", "None"],
      default: "Paid",
    },
    overtimeRateType: {
      type: String,
      enum: ["FIXED_PER_HOUR", "MULTIPLIER_OF_HOURLY"],
      default: "MULTIPLIER_OF_HOURLY",
    },
    overtimeRateValue: { type: Number, default: 1.5 },
  },
  { timestamps: true }
);

export default mongoose.model<IAttendancePolicy>(
  "AttendancePolicy",
  attendancePolicySchema
);
