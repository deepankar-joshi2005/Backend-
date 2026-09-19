"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCalculation = exports.createCalculation = exports.listCalculations = void 0;
const SavedCalculation_1 = __importDefault(require("../models/SavedCalculation"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const paginate_1 = require("../utils/paginate");
const loanMath_1 = require("../utils/loanMath");
// Role Matrix Section 4.4: "View calculation history — all staff: Admin Full, Staff
// None" / "View own calculation history: Staff Full" — Staff only ever see their own.
function scopeToRole(req, filter) {
    if (req.user.role === "ca_firm_staff")
        filter.createdBy = req.user.id;
    return filter;
}
exports.listCalculations = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, skip } = (0, paginate_1.getPagination)(req.query);
    const filter = scopeToRole(req, { caFirmId: req.user.caFirmId });
    if (req.query.clientId)
        filter.clientId = req.query.clientId;
    const [calculations, total] = await Promise.all([
        SavedCalculation_1.default.find(filter)
            .populate("clientId", "name company")
            .populate("createdBy", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        SavedCalculation_1.default.countDocuments(filter),
    ]);
    res.json({ success: true, data: calculations, meta: (0, paginate_1.buildMeta)({ page, limit, total }) });
});
// The formula is recomputed server-side from the raw inputs rather than trusting
// client-sent totals, so a saved record always reflects the real EMI math.
exports.createCalculation = (0, catchAsync_1.default)(async (req, res) => {
    const { type, label, clientId, principal, annualRate, tenureMonths, monthlyIncome, monthlyObligations } = req.body;
    let emi, totalInterest, totalPayment, maxEligibleAmount = null;
    if (type === "eligibility") {
        const result = (0, loanMath_1.estimateEligibility)({ monthlyIncome, monthlyObligations, annualRate, tenureMonths });
        emi = result.maxEmi;
        maxEligibleAmount = result.maxEligibleAmount;
        const emiBreakdown = (0, loanMath_1.calculateEmi)({ principal: maxEligibleAmount, annualRate, tenureMonths });
        totalInterest = emiBreakdown.totalInterest;
        totalPayment = emiBreakdown.totalPayment;
    }
    else {
        if (!principal)
            throw new ApiError_1.default(400, "Principal is required for an EMI calculation");
        const result = (0, loanMath_1.calculateEmi)({ principal, annualRate, tenureMonths });
        emi = result.emi;
        totalInterest = result.totalInterest;
        totalPayment = result.totalPayment;
    }
    const calculation = await SavedCalculation_1.default.create({
        type,
        label,
        clientId,
        principal: type === "eligibility" ? maxEligibleAmount : principal,
        annualRate,
        tenureMonths,
        emi,
        totalInterest,
        totalPayment,
        monthlyIncome: type === "eligibility" ? monthlyIncome : null,
        monthlyObligations: type === "eligibility" ? monthlyObligations : null,
        maxEligibleAmount,
        caFirmId: req.user.caFirmId,
        createdBy: req.user.id,
    });
    const populated = await calculation.populate([{ path: "clientId", select: "name company" }, { path: "createdBy", select: "name" }]);
    res.status(201).json({ success: true, data: populated, message: "Calculation saved" });
});
exports.deleteCalculation = (0, catchAsync_1.default)(async (req, res) => {
    const filter = { _id: req.params.id, caFirmId: req.user.caFirmId };
    // Staff can only remove their own saved calculations; Admin can remove any in the firm.
    if (req.user.role === "ca_firm_staff")
        filter.createdBy = req.user.id;
    const calculation = await SavedCalculation_1.default.findOneAndDelete(filter);
    if (!calculation)
        throw new ApiError_1.default(404, "Calculation not found");
    res.json({ success: true, message: "Calculation deleted" });
});
