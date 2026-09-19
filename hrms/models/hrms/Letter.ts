/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ILetter extends Document {
  user: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  letterType: "OFFER" | "APPOINTMENT" | "PROMOTION" | "WARNING" | "RELIEVING" | "FF_SETTLEMENT" | "EXPERIENCE" | "TERMINATION" | "APPRECIATION" | "TRAINING";
  fileName: string;
  filePath: string;
  originalName: string;
  message?: string;
  sentBy: mongoose.Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
}

const LetterSchema = new Schema<ILetter>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    letterType: {
      type: String,
      enum: [
        "OFFER", 
        "APPOINTMENT", 
        "PROMOTION", 
        "WARNING",
        "RELIEVING",
        "FF_SETTLEMENT",
        "EXPERIENCE",
        "TERMINATION",
        "APPRECIATION",
        "TRAINING"
      ],
      required: true,
    },

    fileName: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
    },

    message: {
      type: String,
    },

    sentBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // HR / Admin
      required: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ILetter>("Letter", LetterSchema);
