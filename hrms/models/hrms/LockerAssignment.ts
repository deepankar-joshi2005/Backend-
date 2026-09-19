/** @format */
import mongoose, { Schema, Document } from "mongoose";

export type AssignmentType = "LOCKER" | "CABIN";
export type AssignmentStatus = "ALLOCATED" | "VACATED";

export interface ILockerAssignment extends Document {
  employee: mongoose.Types.ObjectId;
  type: AssignmentType;
  code: string; // Locker No / Cabin No
  location: string;
  floor: string;
  status: AssignmentStatus;
  assignedAt: Date;
  vacatedAt?: Date;
}

const LockerAssignmentSchema = new Schema<ILockerAssignment>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["LOCKER", "CABIN"],
      required: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
    },

    location: {
      type: String,
      required: true,
    },

    floor: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["ALLOCATED", "VACATED"],
      default: "ALLOCATED",
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    vacatedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ILockerAssignment>(
  "LockerAssignment",
  LockerAssignmentSchema
);
