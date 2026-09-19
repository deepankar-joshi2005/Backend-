/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IDesignation extends Document {
  companyId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  name: string;
  status: "Active" | "Inactive";
  createdAt: Date;
}

const DesignationSchema = new Schema<IDesignation>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDesignation>("Designation", DesignationSchema);
