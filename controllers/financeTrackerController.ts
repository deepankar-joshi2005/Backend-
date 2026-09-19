import ClientFinanceProfile from "../models/ClientFinanceProfile";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { getPagination, buildMeta } from "../utils/paginate";
import { computeFinanceSnapshot, computeLoanEligibility, projectInvestmentValue, PROJECTION_HORIZONS_YEARS } from "../utils/financeTrackerMath";

// Staff only ever see their own tracked profiles; Admin sees every profile in the
// firm — mirrors the same scoping rule the old Loan Calculator used for its history.
function scopeToRole(req, filter) {
  if (req.user.role === "ca_firm_staff") filter.createdBy = req.user.id;
  return filter;
}

function withSnapshot(profile) {
  const doc = profile.toObject ? profile.toObject() : profile;
  return { ...doc, snapshot: computeFinanceSnapshot(doc) };
}

export const listProfiles = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = scopeToRole(req, { caFirmId: req.user.caFirmId });

  const [profiles, total] = await Promise.all([
    ClientFinanceProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ClientFinanceProfile.countDocuments(filter),
  ]);

  res.json({ success: true, data: profiles.map(withSnapshot), meta: buildMeta({ page, limit, total }) });
});

export const getProfile = catchAsync(async (req, res) => {
  const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
  const profile = await ClientFinanceProfile.findOne(filter);
  if (!profile) throw new ApiError(404, "Finance profile not found");

  const snapshot = computeFinanceSnapshot(profile);
  const eligibility = computeLoanEligibility(profile, {
    annualRate: Number(req.query.annualRate) || undefined,
    tenureMonths: Number(req.query.tenureMonths) || undefined,
  });
  const projections = PROJECTION_HORIZONS_YEARS.map((years) => ({
    years,
    value: projectInvestmentValue(snapshot.surplus > 0 ? snapshot.surplus : profile.currentMonthlySavings, 12, years * 12),
  }));

  res.json({ success: true, data: { ...profile.toObject(), snapshot, eligibility, projections } });
});

export const createProfile = catchAsync(async (req, res) => {
  const profile = await ClientFinanceProfile.create({
    ...req.body,
    caFirmId: req.user.caFirmId,
    createdBy: req.user.id,
  });
  res.status(201).json({ success: true, data: withSnapshot(profile), message: "Finance profile saved" });
});

export const updateProfile = catchAsync(async (req, res) => {
  const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
  const profile = await ClientFinanceProfile.findOne(filter);
  if (!profile) throw new ApiError(404, "Finance profile not found");

  Object.assign(profile, req.body);
  await profile.save();

  res.json({ success: true, data: withSnapshot(profile), message: "Finance profile updated" });
});

export const deleteProfile = catchAsync(async (req, res) => {
  const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
  const profile = await ClientFinanceProfile.findOneAndDelete(filter);
  if (!profile) throw new ApiError(404, "Finance profile not found");
  res.json({ success: true, message: "Finance profile deleted" });
});

// Ad-hoc "what if" recompute for the investment-projection widget — doesn't touch
// the saved profile, just runs the same pure formula with different inputs.
export const computeProjection = catchAsync(async (req, res) => {
  const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
  const profile = await ClientFinanceProfile.findOne(filter);
  if (!profile) throw new ApiError(404, "Finance profile not found");

  const { monthlyContribution, annualReturnPercent } = req.body;
  const projections = PROJECTION_HORIZONS_YEARS.map((years) => ({
    years,
    value: projectInvestmentValue(monthlyContribution, annualReturnPercent, years * 12),
  }));

  res.json({ success: true, data: { projections } });
});
