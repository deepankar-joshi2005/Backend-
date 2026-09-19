/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ISelfAppraisal extends Document {
    _id:mongoose.Types.ObjectId;
  appraisalId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;

  goalsAchievement: string;
  goalsRating: number;

  skillsRating: {
    technical: number;
    communication: number;
    teamwork: number;
    problemSolving: number;
  };

  contributions: string;
  challenges: string;
  learning: string;
  summary: string;

  status: "DRAFT" | "SUBMITTED";
  createdAt?: Date;
  updatedAt?: Date;
}

const SelfAppraisalSchema = new Schema(
  {
    appraisalId: {
      type: Schema.Types.ObjectId,
      ref: "Appraisal",
      required: true,
    },
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    goalsAchievement: String,
    goalsRating: Number,

    skillsRating: {
      technical: Number,
      communication: Number,
      teamwork: Number,
      problemSolving: Number,
    },

    contributions: String,
    challenges: String,
    learning: String,
    summary: String,

    status: { type: String, enum: ["DRAFT", "SUBMITTED"], default: "DRAFT" },
  },
  { timestamps: true }
);

export default mongoose.model<ISelfAppraisal>(
  "SelfAppraisal",
  SelfAppraisalSchema
);
