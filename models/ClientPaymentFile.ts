import mongoose from "mongoose";

// One per BusinessClient per month — a snapshot of the bank-ready payment
// rows for that month's payroll run, the same way ClientPayrollEntry snapshots
// payroll numbers rather than pointing at live data: bank details shouldn't
// retroactively change a file that may already have been sent to the bank.
// Generating again (see clientPaymentFileController.generatePaymentFile)
// overwrites this doc — that overwrite IS the "save".
const paymentFileRowSchema = new mongoose.Schema(
  {
    clientEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "ClientEmployee", required: true },
    employeeCode: { type: String, trim: true },
    employeeName: { type: String, trim: true },
    accountHolderName: { type: String, trim: true },
    bankName: { type: String, trim: true },
    bankAccountNumber: { type: String, trim: true },
    bankIfsc: { type: String, trim: true },
    netPayment: { type: Number, default: 0 },
  },
  { _id: false }
);

const clientPaymentFileSchema = new mongoose.Schema(
  {
    businessClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessClient",
      required: true,
      index: true,
    },
    month: { type: String, required: true }, // YYYY-MM
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser" },
    generatedAt: { type: Date },
    rows: { type: [paymentFileRowSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

clientPaymentFileSchema.index({ businessClientId: 1, month: 1 }, { unique: true });

export default mongoose.model("ClientPaymentFile", clientPaymentFileSchema);
