/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  city?: string;
  state?: string;
  address?: string;
  // Which CA firm (CA-Management tenant) this business client belongs to — every
  // Company in this database is provisioned from CA-Management, never registered
  // directly, so this is always set.
  caFirmId?: string;
  caFirmName?: string;
  logo?: string;
  stamp?: string;
  gstNo?: string;
  status: "Active" | "Inactive";
  subscriptionPlan: "TRIAL" | "ACTIVE" | "EXPIRED";
  subscriptionStatus: "PENDING" | "PAID" | "OVERDUE";
  trialStartDate: Date;
  trialEndDate: Date;
  subscriptionEndDate: Date | null;
  employeeLimit: number;
  planTier: string | null;
  subscriptionAmount: number;
  unbilledUsageDays: number; // NEW
  lastBillingDate: Date;      // NEW
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    companyId: {      // NEW
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    industry: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
    },

    caFirmId: {
      type: String,
      default: null,
      index: true,
    },
    caFirmName: {
      type: String,
      default: null,
    },

    logo: {
      type: String,
      default: "",
    },
    stamp: {
      type: String,
      default: "",
    },
    gstNo: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    subscriptionPlan: {
      type: String,
      enum: ["TRIAL", "ACTIVE", "EXPIRED"],
      default: "TRIAL",
    },

    subscriptionStatus: {
      type: String,
      enum: ["PENDING", "PAID", "OVERDUE"],
      default: "PENDING",
    },

    trialStartDate: {
      type: Date,
      default: Date.now,
    },
    trialEndDate: {
      type: Date,
      default: () => new Date(+new Date() + 15 * 24 * 60 * 60 * 1000), // 15 days trial
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },

    employeeLimit: {
      type: Number,
      default: 0,
    },

    // Name snapshot of the HrmsPlanTier chosen at onboarding/last payment
    // (top-level CA-Backend/models/HrmsPlanTier.ts) — employeeLimit is the
    // enforced number; this is just for display ("Growth", "Enterprise", ...).
    planTier: {
      type: String,
      default: null,
    },

    subscriptionAmount: {
      type: Number,
      default: 0,
    },

    unbilledUsageDays: {
      type: Number,
      default: 0,
    },

    lastBillingDate: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional for public registration
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICompany>("Company", companySchema);
// only check