/** @format */

import { Schema, model, Types } from "mongoose";

export interface IWorkstation {
  employee: Types.ObjectId;
  location: string;
  building: string;
  floor: string;
  deskCode: string;
  seatType: "OPEN_DESK" | "CABIN";
  status: "ALLOCATED" | "RELEASED";
  allocatedAt: Date;
  releasedAt?: Date;
}

const workstationSchema = new Schema<IWorkstation>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    building: {
      type: String,
      required: true,
    },

    floor: {
      type: String,
      required: true,
    },

    deskCode: {
      type: String,
      required: true,
      unique: true,
    },

    seatType: {
      type: String,
      enum: ["OPEN_DESK", "CABIN"],
      required: true,
    },

    status: {
      type: String,
      enum: ["ALLOCATED", "RELEASED"],
      default: "ALLOCATED",
    },

    allocatedAt: {
      type: Date,
      default: Date.now,
    },

    releasedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default model<IWorkstation>("Workstation", workstationSchema);
