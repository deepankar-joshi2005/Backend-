import mongoose from "mongoose";

// Seat/business-client limits per the Multi-Tenancy & Licensing Model doc, Section 5.
export const PLAN_LIMITS = {
  starter: { seatLimit: 3, businessClientLimit: 10 },
  growth: { seatLimit: 10, businessClientLimit: 50 },
  enterprise: { seatLimit: null, businessClientLimit: null }, // null = unlimited/custom
};

export const CONSTITUTION_TYPES = ["proprietorship", "partnership", "llp"];

const caFirmSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    // Optional at the schema level so the self-serve trial signup (authController.registerFirm)
    // keeps working without them; the Super Admin onboarding form requires them via its Zod schema.
    icaiRegistrationNumber: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    pan: { type: String, trim: true, uppercase: true },
    gstin: { type: String, trim: true, uppercase: true },
    constitutionType: { type: String, enum: CONSTITUTION_TYPES },
    address: {
      line1: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      country: { type: String, trim: true, default: "India" },
    },
    logoUrl: { type: String },
    plan: {
      tier: {
        type: String,
        enum: ["starter", "growth", "enterprise"],
        default: "starter",
      },
      status: {
        type: String,
        enum: ["trial", "active", "suspended", "expired"],
        default: "trial",
      },
      seatLimit: { type: Number, default: 3 },
      businessClientLimit: { type: Number, default: 10 },
      billingCycle: { type: String, enum: ["monthly", "annual"], default: "monthly" },
      startDate: { type: Date, default: Date.now },
      expiryDate: { type: Date },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("CaFirm", caFirmSchema);
