/** @format */

import mongoose, { Schema, Document } from "mongoose";

export type CardType = "ID_CARD" | "ACCESS_CARD";
export type CardStatus = "ACTIVE" | "RETURNED" | "BLOCKED";

export interface IAccessCard extends Document {
  employee: mongoose.Types.ObjectId;
  cardType: CardType;
  cardNumber: string;
  accessLevel: string;
  status: CardStatus;
  issuedAt: Date;
  returnedAt?: Date;
  remarks?: string;
}

const AccessCardSchema = new Schema<IAccessCard>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cardType: {
      type: String,
      enum: ["ID_CARD", "ACCESS_CARD"],
      required: true,
    },
    cardNumber: {
      type: String,
      required: true,
      unique: true,
    },
    accessLevel: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "RETURNED", "BLOCKED"],
      default: "ACTIVE",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    returnedAt: {
      type: Date,
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAccessCard>("AccessCard", AccessCardSchema);
