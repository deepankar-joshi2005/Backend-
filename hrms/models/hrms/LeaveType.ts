/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveType extends Document {
  name: string;
  code: string;
  maxDays: number;
  paid: boolean;
  carryForward: boolean;
  isActive: boolean;
}

const LeaveTypeSchema: Schema<ILeaveType> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    maxDays: {
      type: Number,
      required: true,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    carryForward: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ILeaveType>("LeaveType", LeaveTypeSchema);
