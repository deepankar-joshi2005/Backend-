/** @format */

import { Schema, model, Document } from "mongoose";

export interface IOvertime extends Document {
  employee: Schema.Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  hours: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

const overtimeSchema = new Schema<IOvertime>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    hours: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

export default model<IOvertime>("Overtime", overtimeSchema);
