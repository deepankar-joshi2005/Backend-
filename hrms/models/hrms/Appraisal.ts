/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IAppraisal extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  type: "MID_YEAR" | "ANNUAL";
  startDate: Date;
  endDate: Date;
  department: string; // "ALL" or department name
  applicableFor: mongoose.Types.ObjectId[]; // specific employees this appraisal applies to; empty = all employees
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  progress: number; // 0 - 100
  createdBy: mongoose.Types.ObjectId;
}

const AppraisalSchema = new Schema<IAppraisal>(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["MID_YEAR", "ANNUAL"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    department: { type: String, default: "ALL" },
    applicableFor: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "CLOSED"],
      default: "DRAFT",
    },
    progress: { type: Number, default: 0 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAppraisal>("Appraisal", AppraisalSchema);
