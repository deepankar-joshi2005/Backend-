import mongoose from "mongoose";

// Per the Stakeholder & Role Matrix: 5 fixed roles across 3 tiers.
export const ROLES = [
  "super_admin", // Tier 1 — Platform Owner
  "ca_firm_admin", // Tier 2 — Licensee CA Firm
  "ca_firm_staff", // Tier 2 — Licensee CA Firm
  "business_client_admin", // Tier 3 — CA Firm's Business Client
  "business_client_employee", // Tier 3 — CA Firm's Business Client
];

// Fixed legal-standing options for a firm's admin (the practicing CA), used by the
// onboarding validator. CA Firm Staff designations (article assistant, accountant,
// manager, ...) vary too much to enumerate, so the schema field below stays free text.
export const DESIGNATIONS = ["proprietor", "partner", "director", "authorized_signatory"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, trim: true, enum: ROLES },
    // Tier 2/3 users belong to a CA firm; only super_admin has none.
    caFirmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CaFirm",
      default: null,
      validate: {
        validator(value) {
          if (this.role === "super_admin") return value === null || value === undefined;
          return !!value;
        },
        message: "caFirmId is required for non-super-admin users",
      },
    },
    // Only set for business_client_admin / business_client_employee (nested
    // HRMS tenant under a CA firm).
    businessClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessClient",
      default: null,
      validate: {
        validator(value) {
          if (["business_client_admin", "business_client_employee"].includes(this.role)) return !!value;
          return value === null || value === undefined;
        },
        message: "businessClientId is required for business client users only",
      },
    },
    phone: { type: String, trim: true },
    // Tier 2 (CA firm) identity fields — who this person is within the firm and
    // their ICAI membership number. Not applicable to super_admin or Tier 3 users.
    // Free text: valid values differ for a firm admin (DESIGNATIONS) vs staff (job title).
    designation: { type: String, trim: true },
    icaiMembershipNo: { type: String, trim: true },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", default: null },
  },
  { timestamps: true }
);

userSchema.index({ caFirmId: 1, role: 1 });

// Model name is "CaUser" (not "User") — HRMS is merged into this same process
// and its own model is already registered as "User" against the shared mongoose
// instance; collection name stays "users", unaffected, only the two systems'
// internal Mongoose model names needed to stop colliding.
export default mongoose.model("CaUser", userSchema, "users");
