import mongoose from "mongoose";

// Lightweight employee master for non-HRMS Business Clients (useHrms: false)
// — they have no HRMS User records at all, so this is the only place their
// employees exist. Matched across monthly Excel uploads by employeeCode.
const clientEmployeeSchema = new mongoose.Schema(
  {
    businessClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessClient",
      required: true,
      index: true,
    },
    // System-generated (see utils/employeeIdGenerator.ts) — clients no longer
    // supply this in the Excel import, so it can't be trusted as human input.
    employeeCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    // Lowercased/trimmed name — since Excel imports no longer carry a stable
    // employee code, this is how the same employee is matched across months.
    nameKey: { type: String, required: true, index: true },
    costCenter: { type: String, trim: true },
    designation: { type: String, trim: true },
    dateOfJoining: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

clientEmployeeSchema.index({ businessClientId: 1, employeeCode: 1 }, { unique: true });

export default mongoose.model("ClientEmployee", clientEmployeeSchema);
