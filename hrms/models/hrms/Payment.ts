/** @format */
import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  orderId: string;
  paymentId: string;
  signature: string;
  amount: number;
  currency: string;
  status: "PENDING" | "CAPTURED" | "FAILED";
  method: string;
  receipt: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: {
      type: String,
      required: true,
      unique: true,
    },
    signature: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["PENDING", "CAPTURED", "FAILED"],
      default: "PENDING",
    },
    method: {
      type: String,
    },
    receipt: {
      type: String,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPayment>("Payment", paymentSchema);
