import mongoose from "mongoose";

// Per-BusinessClient configuration of which salary components appear on their
// Excel payroll template — clients differ on what allowances/deductions they
// pay (Gross/HRA/DA/Conveyance vs. just a flat Gross, etc.), so this can't be
// a single fixed schema like HRMS's own SalaryStructure model. "Basic" is the
// component name used everywhere (not "Basic Salary") — see
// applyPercentagesToStructure in clientPayrollController.ts.
export const DEFAULT_EARNING_COMPONENTS = [
  "Basic",
  "DA",
  "Retaining Allowance",
  "HRA",
  "Conveyance",
  "Education Allowance",
  "Special Allowance",
  "Medical Allowance",
  "Food Allowance",
  "Performance Bonus",
  "Overtime",
  "Commission",
  "Telephone Allowance",
];
export const DEFAULT_DEDUCTION_COMPONENTS = [
  "Employee PF",
  "Employee ESI",
  "LWF",
  "Professional Tax",
  "TDS",
  "NPS",
  "VPF",
  "Other Deductions",
];

// Components that are always a % (of Basic, or of CTC for Basic itself) — no
// "Fixed" option, since a flat rupee amount wouldn't be statutorily/
// conventionally meaningful here. Everything else in earningComponents/
// deductionComponents (including Basic) can be toggled between "percent" and
// "fixed" (same flat amount for every employee) via Structure Setting — see
// componentModes below.
export const PERCENT_ONLY_COMPONENTS = ["NPS"];
export const COMPONENT_MODES = ["percent", "fixed"];

// "Basic" is configured via Structure Setting like any other component — %
// or Fixed — except its % is of CTC (not of Basic, obviously). Shown first
// in the component list since everything else derives from it. Employee
// PF/ESI, in contrast, have a fixed, universal formula — never a %/fixed
// value set via Structure Setting, for any client, ever (see
// applyPercentagesToStructure and the statutory constants below).
export const NON_CONFIGURABLE_COMPONENTS = ["Employee PF", "Employee ESI"];

// Statutory PF/ESI wage rules (same for every client/employee — not
// configurable). "Statutory Wages" = Basic + DA + Retaining Allowance +
// Add-back, where Add-back claws back allowances structured specifically to
// keep PF/ESI wages artificially low:
//   Add-back = max(0, sum(STATUTORY_EXCLUDED_COMPONENTS) − 50% of Gross)
// PF Wages = min(Statutory Wages, PF_WAGE_CEILING); Employee PF = PF Wages × PF_RATE.
// ESI Wages = Statutory Wages ≤ ESI_WAGE_CEILING ? Statutory Wages : 0;
// Employee ESI = ESI Wages × ESI_RATE (crossing the ceiling exempts the
// employee from ESI entirely that month, unlike PF's wage cap).
export const STATUTORY_WAGE_BASE_COMPONENTS = ["Basic", "DA", "Retaining Allowance"];
export const STATUTORY_EXCLUDED_COMPONENTS = [
  "HRA",
  "Conveyance",
  "Education Allowance",
  "Special Allowance",
  "Medical Allowance",
  "Food Allowance",
  "Performance Bonus",
  "Overtime",
  "Commission",
];
export const PF_WAGE_CEILING = 25000;
export const PF_RATE = 0.12;
export const ESI_WAGE_CEILING = 21000;
export const ESI_RATE = 0.0075;

// Employer-side contributions — same PF Wages/ESI Wages bases as above, but
// the employer's own cost, never deducted from the employee (doesn't affect
// Gross/Net at all — purely a reporting figure alongside CTC/Gross on the
// structure). Employer PF uses the same rate as Employee PF; Employer ESI's
// rate is different from Employee ESI's — do not mix the two up.
export const EMPLOYER_PF_RATE = 0.12;
export const EMPLOYER_ESI_RATE = 0.0325;

// Roles a template column can play. "employeeName" is the only one that must
// always exist (an Excel row needs some way to be matched to an employee);
// the rest are deletable per-client via Template Settings — see
// clientPayrollController.ts's updateTemplateColumns / getOrCreateSettings.
// "ctc" is the one directly-entered monetary figure (Cost To Company) — Basic
// is a % of it (or a flat fixed amount) set via Structure Setting, and every
// other earning/deduction component is a % of that Basic (see
// applyPercentagesToStructure); there's no separate "basicSalary" role.
export const TEMPLATE_COLUMN_ROLES = ["employeeName", "ctc", "payDays", "totalWorkingDays", "custom"];
export const TEMPLATE_COLUMN_DATA_TYPES = ["text", "number", "date"];

// Default Excel template shape — First Name/Last Name/Full Name.../ESI NO are
// purely informational "custom" columns (stored per-month in customFields,
// never synced into ClientEmployee's own fields); "Full Name" carries the
// employeeName role since it's what rows are matched to employees by. Month
// is likewise informational (the upload is already scoped to one month via
// the month picker). CTC sits between ESI NO and Month. A CA can still add,
// remove or reorder any of this per-client via Template Settings.
export const DEFAULT_TEMPLATE_COLUMNS = [
  { key: "firstName", label: "First Name", role: "custom", dataType: "text", order: 1 },
  { key: "lastName", label: "Last Name", role: "custom", dataType: "text", order: 2 },
  { key: "employeeName", label: "Full Name", role: "employeeName", dataType: "text", order: 3 },
  { key: "department", label: "Department", role: "custom", dataType: "text", order: 4 },
  { key: "designation", label: "Designation", role: "custom", dataType: "text", order: 5 },
  { key: "location", label: "Location", role: "custom", dataType: "text", order: 6 },
  { key: "pan", label: "PAN", role: "custom", dataType: "text", order: 7 },
  { key: "uanEpfNo", label: "UAN/ EPF NO", role: "custom", dataType: "text", order: 8 },
  { key: "esiNo", label: "ESI NO", role: "custom", dataType: "text", order: 9 },
  { key: "ctc", label: "CTC", role: "ctc", dataType: "number", order: 10 },
  { key: "month", label: "Month", role: "custom", dataType: "text", order: 11 },
  { key: "totalWorkingDays", label: "Total Days", role: "totalWorkingDays", dataType: "number", order: 12 },
  { key: "payDays", label: "Pay Days", role: "payDays", dataType: "number", order: 13 },
];

const templateColumnSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    role: { type: String, enum: TEMPLATE_COLUMN_ROLES, default: "custom" },
    dataType: { type: String, enum: TEMPLATE_COLUMN_DATA_TYPES, default: "text" },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

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
    // component name -> % of Basic, set via "Structure Setting" — only
    // meaningful when that component's mode is "percent" (the default).
    // Never has a "Basic" key — that's a fixed formula, not configured.
    componentPercentages: { type: Map, of: Number, default: {} },
    // component name -> flat rupee amount, same for every employee — only
    // meaningful when that component's mode is "fixed". e.g. Arrears set to
    // 1000 here means every employee's Arrears is ₹1000 that month.
    componentFixedAmounts: { type: Map, of: Number, default: {} },
    // component name -> "percent" | "fixed". Absent/undefined means
    // "percent" (matches pre-existing clients' behavior exactly). Components
    // in PERCENT_ONLY_COMPONENTS (and "Basic") ignore this and are always
    // treated as "percent" — enforced server-side in
    // updateComponentPercentages, not just trusted from the client.
    componentModes: { type: Map, of: String, default: {} },
    // Columns on the downloadable/uploadable monthly Excel template — separate
    // from earningComponents/deductionComponents above (those only drive the
    // % calculator). See utils/clientPayrollExcel.ts. Defaults set lazily by
    // getOrCreateSettings so pre-existing clients are unaffected until they
    // open "Template Settings" themselves.
    templateColumns: { type: [templateColumnSchema], default: DEFAULT_TEMPLATE_COLUMNS },
  },
  { timestamps: true }
);

export default mongoose.model("ClientPayrollSettings", clientPayrollSettingsSchema);
