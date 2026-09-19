/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ISoftwareAssignment extends Document {
  user: mongoose.Types.ObjectId;
  software: string;
  licenseKey?: string;
  expiryDate?: Date;
  remarks?: string;
  status: "ACTIVE" | "REVOKED";
  assignedAt: Date;
}

const SoftwareAssignmentSchema = new Schema<ISoftwareAssignment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    software: {
      type: String,
      required: true,
      trim: true,
    },

    licenseKey: {
      type: String,
      trim: true,
    },

    expiryDate: {
      type: Date,
    },

    remarks: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "REVOKED"],
      default: "ACTIVE",
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISoftwareAssignment>(
  "SoftwareAssignment",
  SoftwareAssignmentSchema
);
