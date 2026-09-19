/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IResignation extends Document {
  employee: mongoose.Types.ObjectId;
  resignationType: string;
  reasonCategory: string;
  reasonText: string;
  expectedLastWorkingDay: Date;
  documents?: string;
  department?: mongoose.Types.ObjectId;
  status: "PENDING" | "APPROVED" | "REJECTED";
  companyId: mongoose.Types.ObjectId;
}

const ResignationSchema = new Schema<IResignation>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: false,
    },

    resignationType: {
      type: String,
      required: true,
      trim: true,
    },

    reasonCategory: {
      type: String,
      required: true,
      trim: true,
    },

    reasonText: {
      type: String,
      required: true,
    },

    expectedLastWorkingDay: {
      type: Date,
      required: true,
    },

    documents: {
      type: String,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
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

export default mongoose.model<IResignation>("Resignation", ResignationSchema);
