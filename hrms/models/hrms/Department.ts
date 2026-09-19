/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  companyId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  name: string;
  headEmployeeId?: mongoose.Types.ObjectId;
  status: "Active" | "Inactive";
  createdAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    headEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDepartment>("Department", departmentSchema);
