/** @format */

import { Schema, model, Document, Types } from "mongoose";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IAttendanceRequest extends Document {
  user: Types.ObjectId;
  date: string;
  type: string;
  punchIn?: string;
  punchOut?: string;
  reason: string;
  status: RequestStatus;
  adminRemark?: string;
  companyId: Types.ObjectId;
}

const attendanceRequestSchema = new Schema<IAttendanceRequest>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    type: { type: String, required: true },
    punchIn: String,
    punchOut: String,
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    adminRemark: String,
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default model<IAttendanceRequest>(
  "AttendanceRequest",
  attendanceRequestSchema
);
