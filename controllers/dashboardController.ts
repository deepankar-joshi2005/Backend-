import CaFirm from "../models/CaFirm";
import User from "../models/User";
import BusinessClient from "../models/BusinessClient";
import catchAsync from "../utils/catchAsync";

// Matches the Super Admin flow's dashboard step: Active Licences, Revenue
// Summary, System Alerts (licences expiring within 7 days).
// Last 6 calendar months (including the current one), oldest first — for the
// onboarding trend chart. Months with zero signups still get an entry so the
// chart has a continuous x-axis instead of skipping gaps.
async function getSignupTrend() {
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const rows = await CaFirm.aggregate([
    { $match: { createdAt: { $gte: rangeStart } } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
  ]);
  const byKey = new Map(rows.map((r) => [`${r._id.year}-${r._id.month}`, r.count]));

  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    trend.push({ month: d.toLocaleDateString("en-US", { month: "short" }), count: byKey.get(key) || 0 });
  }
  return trend;
}

export const getSuperAdminDashboard = catchAsync(async (req, res) => {
  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalFirms,
    activeLicences,
    trialFirms,
    expiredFirms,
    totalUsers,
    totalBusinessClients,
    expiringSoon,
    recentFirms,
    signupTrend,
  ] = await Promise.all([
    CaFirm.countDocuments(),
    CaFirm.countDocuments({ "plan.status": "active" }),
    CaFirm.countDocuments({ "plan.status": "trial" }),
    CaFirm.countDocuments({ "plan.status": { $in: ["expired", "suspended"] } }),
    User.countDocuments({ role: { $ne: "super_admin" } }),
    BusinessClient.countDocuments(),
    CaFirm.find({
      "plan.status": { $in: ["trial", "active"] },
      "plan.expiryDate": { $gte: now, $lte: sevenDaysOut },
    })
      .select("name plan.expiryDate plan.status plan.tier")
      .sort({ "plan.expiryDate": 1 }),
    CaFirm.find().select("name plan createdAt").sort({ createdAt: -1 }).limit(5),
    getSignupTrend(),
  ]);

  res.json({
    success: true,
    data: {
      totalFirms,
      activeLicences,
      trialFirms,
      expiredFirms,
      totalUsers,
      totalBusinessClients,
      expiringSoon,
      recentFirms,
      signupTrend,
    },
  });
});
