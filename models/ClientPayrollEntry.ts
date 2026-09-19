import mongoose from "mongoose";

// One per employee per ClientPayrollRun. Snapshots the salary components used
// (rather than just pointing at ClientEmployeeSalaryStructure) so history
// stays correct even if the employee's structure changes in a later month.
const clientPayrollEntrySchema = new mongoose.Schema(
  {
    payrollRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientPayrollRun",
      required: true,
      index: true,
    },
    clientEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientEmployee",
      required: true,
    },
    costCenter: { type: String, trim: true },
    payDays: { type: Number, required: true },
    lopDays: { type: Number, default: 0 },
    earnings: { type: Map, of: Number, default: {} },
    deductions: { type: Map, of: Number, default: {} },
    gross: { type: Number, default: 0 },
    totalDeduction: { type: Number, default: 0 },
    perDayRate: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
  },
  { timestamps: true }
);

clientPayrollEntrySchema.index({ payrollRunId: 1, clientEmployeeId: 1 }, { unique: true });

export default mongoose.model("ClientPayrollEntry", clientPayrollEntrySchema);
