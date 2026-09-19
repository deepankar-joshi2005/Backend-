/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IFeedbackAndRatings extends Document {
  selfAppraisalId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId; // manager / HR

  managerRatings: {
    goals: number;
    skills: number;
    behaviour: number;
    overall: number;
  };

  feedback: string;
  recommendation: "PROMOTE" | "HIKE" | "PIP" | "NO_CHANGE";

  createdAt?: Date;
  updatedAt?: Date;
}

const FeedbackAndRatingsSchema = new Schema(
  {
    selfAppraisalId: {
      type: Schema.Types.ObjectId,
      ref: "SelfAppraisal",
      required: true,
      unique: true,
    },

    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    managerRatings: {
      goals: { type: Number, required: true },
      skills: { type: Number, required: true },
      behaviour: { type: Number, required: true },
      overall: { type: Number, required: true },
    },

    feedback: { type: String },
    recommendation: {
      type: String,
      enum: ["PROMOTE", "HIKE", "PIP", "NO_CHANGE"],
      default: "NO_CHANGE",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IFeedbackAndRatings>(
  "FeedbackAndRatings",
  FeedbackAndRatingsSchema
);
