/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ITrainingProgress extends Document {
  companyId: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  module: mongoose.Types.ObjectId;
  status: "Pending" | "In-Progress" | "Completed";
  completedContentIds: mongoose.Types.ObjectId[];
  isTestUnlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const trainingProgressSchema = new Schema<ITrainingProgress>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    module: { type: Schema.Types.ObjectId, ref: "TrainingModule", required: true, index: true },
    status: { type: String, enum: ["Pending", "In-Progress", "Completed"], default: "Pending" },
    completedContentIds: [{ type: Schema.Types.ObjectId }],
    isTestUnlocked: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "training_progress" }
);

trainingProgressSchema.index({ user: 1, module: 1 }, { unique: true });

export default mongoose.model<ITrainingProgress>("TrainingProgress", trainingProgressSchema);
