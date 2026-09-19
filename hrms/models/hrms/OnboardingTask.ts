/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IOnboardingTask extends Document {
  employee: mongoose.Types.ObjectId; // New Joinee
  department: mongoose.Types.ObjectId; // IT / Admin / Finance
  assignedTo: mongoose.Types.ObjectId; // Department Head
  task: string;
  status: "PENDING" | "COMPLETED";
  companyId: mongoose.Types.ObjectId;
}

const onboardingTaskSchema = new Schema<IOnboardingTask>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User", // department head
      required: true,
    },

    task: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
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

export default mongoose.model<IOnboardingTask>(
  "OnboardingTask",
  onboardingTaskSchema
);
