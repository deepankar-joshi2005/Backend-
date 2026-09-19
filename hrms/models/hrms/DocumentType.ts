/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IDocumentType extends Document {
  key: string;
  label: string;
  description?: string;
  companyId: mongoose.Types.ObjectId;
}

const DocumentTypeSchema = new Schema<IDocumentType>(
  {
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
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

// A company can't define the same document type key twice
DocumentTypeSchema.index({ companyId: 1, key: 1 }, { unique: true });

export default mongoose.model<IDocumentType>("DocumentType", DocumentTypeSchema);
