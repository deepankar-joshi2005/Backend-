"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CALCULATION_TYPES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.CALCULATION_TYPES = ["emi", "eligibility"];
const savedCalculationSchema = new mongoose_1.default.Schema({
    type: { type: String, enum: exports.CALCULATION_TYPES, required: true },
    label: { type: String, trim: true },
    clientId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Lead", required: true },
    principal: { type: Number, required: true },
    annualRate: { type: Number, required: true },
    tenureMonths: { type: Number, required: true },
    emi: { type: Number, required: true },
    totalInterest: { type: Number, required: true },
    totalPayment: { type: Number, required: true },
    // Only set for type: "eligibility".
    monthlyIncome: { type: Number, default: null },
    monthlyObligations: { type: Number, default: null },
    maxEligibleAmount: { type: Number, default: null },
    caFirmId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CaUser", required: true },
}, { timestamps: true });
savedCalculationSchema.index({ caFirmId: 1, createdBy: 1 });
exports.default = mongoose_1.default.model("SavedCalculation", savedCalculationSchema);
