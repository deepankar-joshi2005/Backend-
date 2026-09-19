import SavedCalculation from "../models/SavedCalculation";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { getPagination, buildMeta } from "../utils/paginate";
import { calculateEmi, estimateEligibility } from "../utils/loanMath";

// Role Matrix Section 4.4: "View calculation history — all staff: Admin Full, Staff
// None" / "View own calculation history: Staff Full" — Staff only ever see their own.
function scopeToRole(req, filter) {
  if (req.user.role === "ca_firm_staff") filter.createdBy = req.user.id;
  return filter;
}

export const listCalculations = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = scopeToRole(req, { caFirmId: req.user.caFirmId });
  if (req.query.clientId) filter.clientId = req.query.clientId;

  const [calculations, total] = await Promise.all([
    SavedCalculation.find(filter)
      .populate("clientId", "name company")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SavedCalculation.countDocuments(filter),
  ]);

  res.json({ success: true, data: calculations, meta: buildMeta({ page, limit, total }) });
});

// The formula is recomputed server-side from the raw inputs rather than trusting
// client-sent totals, so a saved record always reflects the real EMI math.
export const createCalculation = catchAsync(async (req, res) => {
  const { type, label, clientId, principal, annualRate, tenureMonths, monthlyIncome, monthlyObligations } = req.body;

  let emi, totalInterest, totalPayment, maxEligibleAmount = null;

  if (type === "eligibility") {
    const result = estimateEligibility({ monthlyIncome, monthlyObligations, annualRate, tenureMonths });
    emi = result.maxEmi;
    maxEligibleAmount = result.maxEligibleAmount;
    const emiBreakdown = calculateEmi({ principal: maxEligibleAmount, annualRate, tenureMonths });
    totalInterest = emiBreakdown.totalInterest;
    totalPayment = emiBreakdown.totalPayment;
  } else {
    if (!principal) throw new ApiError(400, "Principal is required for an EMI calculation");
    const result = calculateEmi({ principal, annualRate, tenureMonths });
    emi = result.emi;
    totalInterest = result.totalInterest;
    totalPayment = result.totalPayment;
  }

  const calculation = await SavedCalculation.create({
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

export const deleteCalculation = catchAsync(async (req, res) => {
  const filter = { _id: req.params.id, caFirmId: req.user.caFirmId };
  // Staff can only remove their own saved calculations; Admin can remove any in the firm.
  if (req.user.role === "ca_firm_staff") filter.createdBy = req.user.id;

  const calculation = await SavedCalculation.findOneAndDelete(filter);
  if (!calculation) throw new ApiError(404, "Calculation not found");

  res.json({ success: true, message: "Calculation deleted" });
});
