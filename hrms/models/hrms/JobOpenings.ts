/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IJobOpening extends Document {
  jobTitle: string;
  department: string;
  location: string;
  openings: number;
  recruitingManager?: string;
  jobDocument?: string;
  status: "Open" | "Closed";
  createdAt: Date;
  updatedAt: Date;
}

const jobOpeningSchema = new Schema<IJobOpening>(
  {
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    openings: {
      type: Number,
      required: true,
      min: 1,
    },

    recruitingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    jobDocument: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open",
    },
  },
  {
    timestamps: true, // Posted On yahin se aayega
  }
);

export default mongoose.model<IJobOpening>("JobOpening", jobOpeningSchema);
