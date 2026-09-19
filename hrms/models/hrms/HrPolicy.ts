/** @format */
import { Schema, model, Document } from "mongoose";

export interface IHrPolicy extends Document {
  no: number;
  name: string;
  requirements: string[];
  legalReference: string;
  documentUrl?: string;
  documentName?: string;
}

const HrPolicySchema = new Schema<IHrPolicy>(
  {
    no: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    requirements: [{ type: String }],
    legalReference: { type: String, default: "" },
    documentUrl: { type: String, default: "" },
    documentName: { type: String, default: "" },
  },
  { timestamps: true }
);

export const HrPolicy = model<IHrPolicy>("HrPolicy", HrPolicySchema);
