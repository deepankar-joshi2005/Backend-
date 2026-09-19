/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IGoal extends Document {
  title: string;
  description?: string;
  assignedTo: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
  progress: number;
  status: "Not Started" | "In Progress" | "Completed";
  deadline:Date;
}

const goalSchema = new Schema<IGoal>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed"],
      default: "Not Started",
    },
    deadline: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// 🔄 Auto status update based on progress
goalSchema.pre("save", function (next) {
  if (this.progress === 0) this.status = "Not Started";
  else if (this.progress >= 100) this.status = "Completed";
  else this.status = "In Progress";
  next();
});

export default mongoose.model<IGoal>("Goal", goalSchema);
