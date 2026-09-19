/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IBranch extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  city: string;
  state: string;
  country: string;
  address?: string;
  pincode?: string;
  status: "Active" | "Inactive";
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: "India" },
    address: { type: String },
    pincode: { type: String },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IBranch>("Branch", branchSchema);
