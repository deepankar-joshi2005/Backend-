import mongoose from "mongoose";

// Per-BusinessClient configuration of which salary components appear on their
// Excel payroll template — clients differ on what allowances/deductions they
// pay (Gross/HRA/DA/Conveyance vs. just a flat Gross, etc.), so this can't be
// a single fixed schema like HRMS's own SalaryStructure model.
export const DEFAULT_EARNING_COMPONENTS = [
  "Basic Salary",
  "Dearness Allowance",
  "Retention Allowance",
  "HRA",
  "Conveyance Allowance",
  "Transport Allowance",
  "Medical Allowance",
  "LTA",
  "Special Allowance",
  "Shift Allowance",
  "Night Shift Allowance",
  "Attendance Allowance",
  "Production Incentive",
  "Productivity Incentive",
  "Overtime",
  "Performance Incentive",
  "Sales Incentive",
  "Bonus",
  "Arrears",
  "Leave Encashment",
  "Other Earnings",
];
export const DEFAULT_DEDUCTION_COMPONENTS = [
  "Employee PF",
  "Voluntary PF",
  "Employee ESI",
  "Professional Tax",
  "Labour Welfare Fund",
  "NPS",
  "TDS",
  "Other Statutory Deduction",
];

const clientPayrollSettingsSchema = new mongoose.Schema(
  {
    businessClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessClient",
      required: true,
      unique: true,
    },
    earningComponents: { type: [String], default: DEFAULT_EARNING_COMPONENTS },
    deductionComponents: { type: [String], default: DEFAULT_DEDUCTION_COMPONENTS },
    // component name -> % of Basic Salary, set via "Structure Setting". Excludes
    // "Basic Salary" itself, which always comes straight from the Excel import.
    componentPercentages: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("ClientPayrollSettings", clientPayrollSettingsSchema);
