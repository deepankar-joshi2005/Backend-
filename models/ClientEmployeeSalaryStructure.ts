import mongoose from "mongoose";

// One doc per ClientEmployee per month — the structure is now versioned
// monthly (each Excel import creates/updates that month's row) rather than a
// single latest-known record. earnings/deductions/gross are always the full,
// un-prorated monthly values; Generate payroll is what prorates by payDays.
const clientEmployeeSalaryStructureSchema = new mongoose.Schema(
  {
    businessClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessClient",
      required: true,
      index: true,
    },
    clientEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientEmployee",
      required: true,
    },
    month: { type: String, required: true }, // YYYY-MM
    payDays: { type: Number, default: 0 },
    totalWorkingDays: { type: Number, default: 0 },
    costCenter: { type: String, trim: true },
    // component name -> amount, keyed against ClientPayrollSettings' component lists.
    earnings: { type: Map, of: Number, default: {} },
    deductions: { type: Map, of: Number, default: {} },
    gross: { type: Number, default: 0 },
  },
  { timestamps: true }
);

clientEmployeeSalaryStructureSchema.index({ clientEmployeeId: 1, month: 1 }, { unique: true });

export default mongoose.model("ClientEmployeeSalaryStructure", clientEmployeeSalaryStructureSchema);
