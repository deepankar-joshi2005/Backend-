/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ICandidate extends Document {
  name: string;
  email: string;
  jobId: mongoose.Types.ObjectId;
  jobTitle: string;
  recruitingManager: string;
  mobile: string;
  resumeUrl: string;
  status: "Applied" | "Shortlisted" | "Rejected" | "Hired";
  applied: boolean;
  shortlisted: boolean;
  hrRound: boolean;
  techRound: boolean;
  offer: boolean;
  hired: boolean;
  feedback?: string;
  hiringDate?: Date;
  joiningDate?: Date;
  createdAt: Date;
}

const candidateSchema = new Schema<ICandidate>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    jobId: { type: Schema.Types.ObjectId, ref: "JobOpening", required: true },
    jobTitle: { type: String, required: true },
    recruitingManager: { type: String, trim: true },
    mobile: { type: String, required: true, trim: true },
    resumeUrl: { type: String, required: true },
    hiringDate: { type: Date },
    joiningDate: { type: Date },

    status: {
      type: String,
      enum: ["Applied", "Shortlisted", "Rejected", "Hired"],
      default: "Applied",
    },
    applied: { type: Boolean, default: true },
    shortlisted: { type: Boolean, default: false },
    hrRound: { type: Boolean, default: false },
    techRound: { type: Boolean, default: false },
    offer: { type: Boolean, default: false },
    hired: { type: Boolean, default: false },
    feedback: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICandidate>("Candidate", candidateSchema);
