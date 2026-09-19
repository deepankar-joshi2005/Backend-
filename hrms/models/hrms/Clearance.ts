/** @format */

import mongoose, { Schema, Document } from "mongoose";

export type ClearanceStatus = "PENDING" | "CLEARED" | "ISSUE";

export interface IDepartmentClearance {
  department: "IT" | "Finance" | "HR" | "Admin";
  tasks: string[];
  status: "PENDING" | "CLEARED" | "ISSUE";
  remarks?: string;
}
export interface IClearance extends Document {
  resignation: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  lastWorkingDay: Date;
  clearances: IDepartmentClearance[];
  overallStatus: "IN_PROGRESS" | "COMPLETED";
  companyId: mongoose.Types.ObjectId;
}

const DepartmentClearanceSchema = new Schema<IDepartmentClearance>({
  department: {
    type: String,
    enum: ["IT", "Finance", "HR","Admin"],
    required: true,
  },
  tasks: [{ type: String }],
  status: {
    type: String,
    enum: ["PENDING", "CLEARED", "ISSUE"],
    default: "PENDING",
  },
  remarks: String,
});


const ClearanceSchema = new Schema<IClearance>(
  {
    resignation: {
      type: Schema.Types.ObjectId,
      ref: "Resignation",
      required: true,
      unique: true,
    },

    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastWorkingDay: {
      type: Date,
      required: true,
    },

    clearances: [DepartmentClearanceSchema],

    overallStatus: {
      type: String,
      enum: ["IN_PROGRESS", "COMPLETED"],
      default: "IN_PROGRESS",
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

export default mongoose.model<IClearance>("Clearance", ClearanceSchema);
