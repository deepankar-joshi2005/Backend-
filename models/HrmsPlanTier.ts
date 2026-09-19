import mongoose from "mongoose";

// Employee-count-based HRMS plan tiers for Business Clients. Lives at the
// top level (not under hrms/) since both CA-Management (the "Add Business
// Client" plan picker) and the HRMS submodule (its own Billing Dashboard)
// read/write this in-process, on the shared connection — same pattern as
// CaFirm/BusinessClient already being read from HRMS controllers.
const hrmsPlanTierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    minEmployees: { type: Number, required: true },
    maxEmployees: { type: Number, default: null }, // null = unlimited
    price: { type: Number, required: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

hrmsPlanTierSchema.index({ order: 1 });

export const DEFAULT_HRMS_PLAN_TIERS = [
  { name: "Starter", minEmployees: 1, maxEmployees: 10, price: 999, order: 1 },
  { name: "Growth", minEmployees: 11, maxEmployees: 50, price: 3999, order: 2 },
  { name: "Business", minEmployees: 51, maxEmployees: 100, price: 7999, order: 3 },
  { name: "Enterprise", minEmployees: 101, maxEmployees: null, price: 14999, order: 4 },
];

export default mongoose.model("HrmsPlanTier", hrmsPlanTierSchema);
