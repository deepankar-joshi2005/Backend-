import mongoose from "mongoose";

export const CALCULATION_TYPES = ["emi", "eligibility"];

const savedCalculationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: CALCULATION_TYPES, required: true },
    label: { type: String, trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    principal: { type: Number, required: true },
    annualRate: { type: Number, required: true },
    tenureMonths: { type: Number, required: true },
    emi: { type: Number, required: true },
    totalInterest: { type: Number, required: true },
    totalPayment: { type: Number, required: true },
    // Only set for type: "eligibility".
    monthlyIncome: { type: Number, default: null },
    monthlyObligations: { type: Number, default: null },
    maxEligibleAmount: { type: Number, default: null },
    caFirmId: { type: mongoose.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", required: true },
  },
  { timestamps: true }
);

savedCalculationSchema.index({ caFirmId: 1, createdBy: 1 });

export default mongoose.model("SavedCalculation", savedCalculationSchema);
