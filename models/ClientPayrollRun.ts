import mongoose from "mongoose";

export const CLIENT_PAYROLL_RUN_STATUSES = ["Draft", "Generated", "Completed"];

// One per BusinessClient per month — mirrors HRMS's own PayrollRun shape
// (hrms/models/hrms/PayrollRun.ts) but driven entirely by an uploaded Excel
// instead of live attendance/leave data.
const clientPayrollRunSchema = new mongoose.Schema(
  {
    businessClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessClient",
      required: true,
      index: true,
    },
    month: { type: String, required: true }, // YYYY-MM
    status: { type: String, enum: CLIENT_PAYROLL_RUN_STATUSES, default: "Draft" },
    sourceFileName: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser" },
    uploadedAt: { type: Date },
    generatedAt: { type: Date },
    runBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser" },
    runAt: { type: Date },
    employeeCount: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    totalDeduction: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    // Set once the CA explicitly saves this month's Salary Structure — Generate
    // payroll is blocked until this is true (see clientPayrollController.generatePayroll).
    structureSaved: { type: Boolean, default: false },
    structureSavedAt: { type: Date },
  },
  { timestamps: true }
);

clientPayrollRunSchema.index({ businessClientId: 1, month: 1 }, { unique: true });

export default mongoose.model("ClientPayrollRun", clientPayrollRunSchema);
