/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IShiftAssignment extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  shift: "MORNING" | "EVENING" | "NIGHT";
  createdAt: Date;
  updatedAt: Date;
}

const ShiftAssignmentSchema = new Schema<IShiftAssignment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    shift: {
      type: String,
      enum: ["MORNING", "EVENING", "NIGHT"],
      required: true,
    },
  },
  { timestamps: true }
);

/* one user – one shift – one day */
ShiftAssignmentSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IShiftAssignment>(
  "ShiftAssignment",
  ShiftAssignmentSchema
);
