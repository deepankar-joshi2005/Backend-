import mongoose from "mongoose";

// One doc per person tracked in Personal Finance Tracker. Optionally linked to an
// existing BusinessClient/Lead (autofilled from there); "Add new client" leaves
// clientModel/clientId null and the personal-detail fields below are the source
// of truth instead — this feature never creates CRM records as a side effect.
const loanSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: false },
    emi: { type: Number, default: 0 },
  },
  { _id: false }
);

const otherLoanSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    emi: { type: Number, default: 0 },
  },
  { _id: false }
);

const clientFinanceProfileSchema = new mongoose.Schema(
  {
    clientModel: { type: String, enum: ["BusinessClient", "Lead"], default: null },
    clientId: { type: mongoose.Schema.Types.ObjectId, refPath: "clientModel", default: null },

    // Personal
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    gstin: { type: String, trim: true, uppercase: true },

    // Professional & income
    company: { type: String, trim: true },
    designation: { type: String, trim: true },
    experienceYears: { type: Number, default: 0 },
    monthlyIncome: { type: Number, required: true },

    // Current loans
    homeLoan: { type: loanSchema, default: () => ({}) },
    carLoan: { type: loanSchema, default: () => ({}) },
    personalLoan: { type: loanSchema, default: () => ({}) },
    otherLoans: { type: [otherLoanSchema], default: [] },

    // Monthly expenses
    expenses: {
      rent: { type: Number, default: 0 },
      groceries: { type: Number, default: 0 },
      utilities: { type: Number, default: 0 },
      transportation: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
      education: { type: Number, default: 0 },
      entertainment: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },

    // Savings
    currentMonthlySavings: { type: Number, default: 0 },

    caFirmId: { type: mongoose.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", required: true },
  },
  { timestamps: true }
);

clientFinanceProfileSchema.index({ caFirmId: 1 });

export default mongoose.model("ClientFinanceProfile", clientFinanceProfileSchema);
