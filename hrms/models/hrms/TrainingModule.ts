/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ITrainingContent {
  _id?: mongoose.Types.ObjectId;
  contentType: "Video" | "PDF" | "PPT";
  mediaUrl: string;
  fileName?: string;
  minWatchTime: number; // seconds, only enforced for Video
}

export interface ITrainingModule extends Document {
  companyId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  departmentId: mongoose.Types.ObjectId | null; // null = visible to every department
  category?: string;
  sequenceOrder: number;
  contents: ITrainingContent[];
  testDurationMinutes: number;
  passPercentage: number;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const trainingContentSchema = new Schema<ITrainingContent>(
  {
    contentType: { type: String, enum: ["Video", "PDF", "PPT"], required: true },
    mediaUrl: { type: String, required: true },
    fileName: { type: String },
    minWatchTime: { type: Number, default: 0 },
  },
  { _id: true }
);

const trainingModuleSchema = new Schema<ITrainingModule>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", default: null, index: true },
    category: {
      type: String,
      enum: ["Induction", "SOP", "Process", "Compliance", "Other"],
      default: "Induction",
    },
    sequenceOrder: { type: Number, required: true, default: 1 },
    contents: { type: [trainingContentSchema], default: [] },
    testDurationMinutes: { type: Number, default: 20, min: 1 },
    passPercentage: { type: Number, default: 70, min: 1, max: 100 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "training_modules" }
);

export default mongoose.model<ITrainingModule>("TrainingModule", trainingModuleSchema);
