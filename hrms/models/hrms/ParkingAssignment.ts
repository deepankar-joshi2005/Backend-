/** @format */

import mongoose, { Schema, Document } from "mongoose";

export type VehicleType = "CAR" | "BIKE";
export type PassType = "PERMANENT" | "TEMPORARY";
export type ParkingStatus = "ALLOCATED" | "VACATED";

export interface IParkingAssignment extends Document {
  employee: mongoose.Types.ObjectId;
  vehicleType: VehicleType;
  vehicleNumber: string;
  parkingSlot: string;
  location: string;
  passType: PassType;
  status: ParkingStatus;
  validFrom: Date;
  validTill?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParkingAssignmentSchema = new Schema<IParkingAssignment>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    vehicleType: {
      type: String,
      enum: ["CAR", "BIKE"],
      required: true,
    },

    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
    },

    parkingSlot: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    passType: {
      type: String,
      enum: ["PERMANENT", "TEMPORARY"],
      default: "PERMANENT",
    },

    status: {
      type: String,
      enum: ["ALLOCATED", "VACATED"],
      default: "ALLOCATED",
    },

    validFrom: {
      type: Date,
      required: true,
    },

    validTill: {
      type: Date,
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IParkingAssignment>(
  "ParkingAssignment",
  ParkingAssignmentSchema
);
