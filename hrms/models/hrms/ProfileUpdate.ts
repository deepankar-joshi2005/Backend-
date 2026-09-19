/** @format */

import mongoose, { Schema, Document } from "mongoose";

export type ProfileUpdateStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IProfileUpdate extends Document {
  employee: mongoose.Types.ObjectId;
  updateType: string;
  newValue: string;
  reason: string;
  status: ProfileUpdateStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileUpdateSchema = new Schema<IProfileUpdate>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updateType: {
      type: String,
      required: true,
      enum: ["phone", "address", "emergencyContact", "bankAccount", "other"],
    },

    newValue: {
      type: String,
      required: true,
      trim: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

export default mongoose.model<IProfileUpdate>(
  "ProfileUpdate",
  ProfileUpdateSchema,
);
