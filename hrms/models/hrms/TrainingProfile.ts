/** @format */

import mongoose, { Schema, Document } from "mongoose";

export type TrainingProfileStatus =
  | "In-Training"
  | "Pending_2nd_Attempt"
  | "Passed"
  | "Failed"
  | "Completed_Onboarding";

export interface ITrainingProfile extends Document {
  companyId: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId | null;
  assignedModules: mongoose.Types.ObjectId[];
  status: TrainingProfileStatus;
  isEligible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const trainingProfileSchema = new Schema<ITrainingProfile>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    assignedModules: [{ type: Schema.Types.ObjectId, ref: "TrainingModule" }],
    status: {
      type: String,
      enum: ["In-Training", "Pending_2nd_Attempt", "Passed", "Failed", "Completed_Onboarding"],
      default: "In-Training",
    },
    isEligible: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "training_profiles" }
);

export default mongoose.model<ITrainingProfile>("TrainingProfile", trainingProfileSchema);
