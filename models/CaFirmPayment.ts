import mongoose from "mongoose";

// Mirrors hrms/models/hrms/Payment.ts's shape — CA Firm's own subscription
// payments, kept separate since they're a different product/tenant layer
// (CaFirm licence, not a Business Client's HRMS Company).
const caFirmPaymentSchema = new mongoose.Schema(
  {
    caFirmId: { type: mongoose.Schema.Types.ObjectId, ref: "CaFirm", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", required: true },
    tier: { type: String, enum: ["starter", "growth", "enterprise"], required: true },
    billingCycle: { type: String, enum: ["monthly", "annual"], required: true },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String, unique: true, sparse: true },
    signature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["PENDING", "CAPTURED", "FAILED"], default: "PENDING" },
    expiryDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("CaFirmPayment", caFirmPaymentSchema);
