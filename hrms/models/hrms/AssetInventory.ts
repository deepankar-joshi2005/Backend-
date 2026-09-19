/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IAsset extends Document {
  assetType: string;
  serialNumber: string;
  warrantyExpiry?: Date;
  accessories: string[];
  status: "AVAILABLE" | "ASSIGNED";
  assignedTo?: mongoose.Types.ObjectId | null; // 👈 ye
}

const AssetSchema = new Schema<IAsset>(
  {
    assetType: {
      type: String,
      required: true,
      default: "Laptop",
      trim: true,
    },

    serialNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    warrantyExpiry: {
      type: Date,
    },

    accessories: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "ASSIGNED"],
      default: "AVAILABLE",
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAsset>("Asset", AssetSchema);
