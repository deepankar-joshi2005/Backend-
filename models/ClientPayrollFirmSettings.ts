import mongoose from "mongoose";

// One doc per CA firm — defaultComponentPercentages is a rolling "last used"
// template: refreshed every time any client's Structure Settings are saved,
// so a brand-new client starts pre-filled instead of blank. Employee ID
// format itself is no longer configurable here — see
// utils/employeeIdGenerator.ts's generateNextEmployeeCode for the fixed
// {Company}-{First}-{Last}-{seq} scheme.
const clientPayrollFirmSettingsSchema = new mongoose.Schema(
  {
    caFirmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CaFirm",
      required: true,
      unique: true,
    },
    defaultComponentPercentages: { type: Map, of: Number, default: {} },
    // Same rolling "last used" idea as defaultComponentPercentages, for the
    // Fixed/Percent choice introduced per-component in Structure Setting.
    defaultComponentModes: { type: Map, of: String, default: {} },
    defaultComponentFixedAmounts: { type: Map, of: Number, default: {} },
    // Firm-wide preferred left-to-right column order for the Salary Structure
    // table — a list of column keys, e.g. "code", "ctc", "e:HRA",
    // "custom:department". Applies across every client's structure page;
    // columns not listed here just keep their default position, appended
    // after the known ones. Set via drag-and-drop on the Salary Structure
    // page — see ClientSalaryStructurePage.tsx.
    columnOrder: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("ClientPayrollFirmSettings", clientPayrollFirmSettingsSchema);
