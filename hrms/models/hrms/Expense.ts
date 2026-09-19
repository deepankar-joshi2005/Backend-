/** @format */
import { Schema, model, Document } from "mongoose";

export interface IExpense extends Document {
  employee: Schema.Types.ObjectId;
  expenseType: string;
  subCategory?: string;
  billingType: "Chargeable" | "Non-Chargeable";
  travelRequestId?: Schema.Types.ObjectId;
  amount: number;
  date: Date;
  remarks?: string;
  receipt?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  paymentStatus: "UNPAID" | "PAID";
}

const ExpenseSchema = new Schema<IExpense>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    expenseType: {
      type: String,
      required: true,
    },

    subCategory: {
      type: String,
    },

    billingType: {
      type: String,
      enum: ["Chargeable", "Non-Chargeable"],
      default: "Non-Chargeable",
      required: true,
    },

    travelRequestId: {
      type: Schema.Types.ObjectId,
      ref: "TravelRequest",
    },

    amount: {
      type: Number,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    remarks: {
      type: String,
    },

    receipt: {
      type: String, // file URL
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "PAID"],
      default: "PENDING",
    },

    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID"],
      default: "UNPAID",
    },
  },
  { timestamps: true }
);

export default model<IExpense>("Expense", ExpenseSchema);
