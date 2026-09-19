/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IUserDocument extends Document {
  user: mongoose.Schema.Types.ObjectId;
  documentType: string;
  documentName: string;
  fileUrl: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedBy?: mongoose.Schema.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  companyId?: mongoose.Schema.Types.ObjectId;
}

const userDocumentSchema = new Schema<IUserDocument>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      required: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUserDocument>("UserDocument", userDocumentSchema);
