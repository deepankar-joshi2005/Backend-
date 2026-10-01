import CaFirm from "../models/CaFirm";
import CaFirmPayment from "../models/CaFirmPayment";
import catchAsync from "../utils/catchAsync";
import { getSystemSettings } from "../utils/getSystemSettings";
import { getPagination, buildMeta, getDateRangeFilter } from "../utils/paginate";

const TIER_PRICE_FIELD = { starter: "starterPrice", growth: "growthPrice", enterprise: "enterprisePrice" };

// All 3 tiers now carry a real, Super-Admin-set price (see caFirmController.ts's
// Razorpay self-pay flow), so all 3 count toward estimated revenue.
export const getBillingSummary = catchAsync(async (req, res) => {
  const [firms, settings] = await Promise.all([CaFirm.find().select("plan"), getSystemSettings()]);

  const byTier = { starter: 0, growth: 0, enterprise: 0 };
  const byStatus = { trial: 0, active: 0, suspended: 0, expired: 0 };
  let estimatedMonthlyRevenue = 0;

  for (const firm of firms) {
    byTier[firm.plan.tier] = (byTier[firm.plan.tier] || 0) + 1;
    byStatus[firm.plan.status] = (byStatus[firm.plan.status] || 0) + 1;
    if (firm.plan.status === "active") {
      estimatedMonthlyRevenue += settings[TIER_PRICE_FIELD[firm.plan.tier]] || 0;
    }
  }

  res.json({
    success: true,
    data: {
      totalFirms: firms.length,
      byTier,
      byStatus,
      estimatedMonthlyRevenue,
      currency: settings.currency,
      pricing: { starter: settings.starterPrice, growth: settings.growthPrice, enterprise: settings.enterprisePrice },
    },
  });
});

// Per-firm drill-down for the Billing page — who's on what plan, when it
// expires, and what they last paid, all in one place for Super Admin.
export const listFirmBilling = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { ...getDateRangeFilter(req.query, "plan.expiryDate") };
  if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };

  const [firms, total] = await Promise.all([
    CaFirm.find(filter).select("name plan").sort({ "plan.expiryDate": 1 }).skip(skip).limit(limit),
    CaFirm.countDocuments(filter),
  ]);
  const lastPayments = await CaFirmPayment.aggregate([
    { $match: { status: "CAPTURED", caFirmId: { $in: firms.map((f) => f._id) } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$caFirmId", amount: { $first: "$amount" }, currency: { $first: "$currency" }, createdAt: { $first: "$createdAt" } } },
  ]);
  const lastPaymentByFirm = new Map(lastPayments.map((p) => [String(p._id), p]));

  res.json({
    success: true,
    data: firms.map((firm) => ({
      _id: firm._id,
      name: firm.name,
      plan: firm.plan,
      lastPayment: lastPaymentByFirm.get(String(firm._id)) || null,
    })),
    meta: buildMeta({ page, limit, total }),
  });
});
