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
    // Cost To Company — the one figure typed directly into the Excel each
    // month. Basic is a % of it (or a flat fixed amount) set via Structure
    // Setting, and every other earning/deduction component is a % of that
    // Basic (or a flat fixed amount) — see applyPercentagesToStructure.
    // Deliberately NOT part of the earnings map below, since it isn't itself
    // a payable line item (it would double-count into Gross otherwise).
    ctc: { type: Number, default: 0 },
    // component name -> amount, keyed against ClientPayrollSettings' component lists.
    earnings: { type: Map, of: Number, default: {} },
    deductions: { type: Map, of: Number, default: {} },
    gross: { type: Number, default: 0 },
    // Employer-side PF/ESI contribution — the employer's own cost, never
    // deducted from the employee and not part of Gross/Net. Computed
    // alongside Employee PF/ESI in applyPercentagesToStructure, off the same
    // PF Wages/ESI Wages bases but different rates.
    employerPf: { type: Number, default: 0 },
    employerEsi: { type: Number, default: 0 },
    // Sanity check, recomputed alongside everything else in
    // applyPercentagesToStructure: uploaded CTC should equal Gross + Employer
    // PF + Employer ESI (CTC itself is never adjusted to match — a mismatch
    // means this employee's Structure Setting %/fixed split doesn't add back
    // up to the CTC that was uploaded). Blocks saveStructureForMonth until
    // fixed — see clientPayrollController.ts.
    ctcMismatch: { type: Boolean, default: false },
    // Per-employee overrides of the client-wide Structure Setting
    // (ClientPayrollSettings.componentModes/Percentages/FixedAmounts) — only
    // components explicitly listed here differ for this one employee; every
    // other component still follows whatever the client-wide setting says
    // (and keeps following it automatically if that's changed later). Set via
    // "Edit salary structure" on this employee's row — see
    // updateEmployeeComponentSettings/applyPercentagesToStructure.
    componentModeOverrides: { type: Map, of: String, default: {} },
    componentPercentageOverrides: { type: Map, of: Number, default: {} },
    componentFixedAmountOverrides: { type: Map, of: Number, default: {} },
    // Values for "custom"-role Template Settings columns (informational only —
    // not used in Gross/Net calculation). Keyed by the column's stable `key`.
    // Stored as strings so one map can hold text/number/date columns alike.
    customFields: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

clientEmployeeSalaryStructureSchema.index({ clientEmployeeId: 1, month: 1 }, { unique: true });

export default mongoose.model("ClientEmployeeSalaryStructure", clientEmployeeSalaryStructureSchema);
