/** @format */

import mongoose, { Schema, Document } from "mongoose";

export type AssetStatus = "AVAILABLE" | "ASSIGNED" | "DAMAGED" | "DISPOSED";

interface IAssignedAsset {
  user: mongoose.Types.ObjectId;
  quantity: number;
}

export interface INonITAsset extends Document {
  assetName: string;
  assetCategory: string;
  assetCode: string;
  quantity: number;
  assignedTo: IAssignedAsset[];
  damagedCount: number;
  location: string;
  status: AssetStatus;
}

const AssignedSchema = new Schema<IAssignedAsset>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const NonITAssetSchema = new Schema<INonITAsset>(
  {
    assetName: String,
    assetCategory: String,
    assetCode: {
      type: String,
      unique: true,
    },
    quantity: {
      type: Number,
      required: true,
    },

    /* 🔥 SMART ASSIGNMENT */
    assignedTo: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],

    damagedCount: {
      type: Number,
      default: 0,
    },

    location: String,

    status: {
      type: String,
      enum: ["AVAILABLE", "ASSIGNED", "DAMAGED", "DISPOSED"],
      default: "AVAILABLE",
    },
  },
  { timestamps: true }
);

export default mongoose.model<INonITAsset>("NonITAsset", NonITAssetSchema);
