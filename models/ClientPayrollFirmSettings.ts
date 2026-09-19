import mongoose from "mongoose";

// One doc per CA firm — the Employee ID format is deliberately firm-wide (the
// same prefix/padding pattern for every client), while defaultComponentPercentages
// is a rolling "last used" template: refreshed every time any client's Structure
// Settings are saved, so a brand-new client starts pre-filled instead of blank.
const clientPayrollFirmSettingsSchema = new mongoose.Schema(
  {
    caFirmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CaFirm",
      required: true,
      unique: true,
    },
    employeeIdPrefix: { type: String, default: "EMP-", trim: true },
    employeeIdPadding: { type: Number, default: 4, min: 1, max: 8 },
    defaultComponentPercentages: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("ClientPayrollFirmSettings", clientPayrollFirmSettingsSchema);
