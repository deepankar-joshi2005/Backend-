/** @format */
import { Schema, model, Document, Types } from "mongoose";

export interface ITravelRequest extends Document {
  employee: Types.ObjectId;
  purpose: string;
  destination: string;
  fromDate: Date;
  toDate: Date;

  budget: number;

  payable?: number; // ✅ Final payable amount
  paymentStatus?: "UNPAID" | "PAID"; // ✅ Payment done or not
  receiptUrl?: string; // ✅ Receipt / bill file URL

  remarks?: string;

  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
}

const TravelRequestSchema = new Schema<ITravelRequest>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    purpose: {
      type: String,
      required: true,
    },

    destination: {
      type: String,
      required: true,
    },

    fromDate: {
      type: Date,
      required: true,
    },

    toDate: {
      type: Date,
      required: true,
    },

    budget: {
      type: Number,
      required: true,
    },

    payable: {
      type: Number,
    },

    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID"],
      default: "UNPAID",
    },

    receiptUrl: {
      type: String,
    },

    remarks: String,

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "PAID"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

export default model<ITravelRequest>("TravelRequest", TravelRequestSchema);
