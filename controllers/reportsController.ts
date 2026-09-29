import mongoose from "mongoose";
import CaFirm from "../models/CaFirm";
import User from "../models/User";
import BusinessClient from "../models/BusinessClient";
import ClientEmployee from "../models/ClientEmployee";
import HrmsCompany from "../hrms/models/hrms/Company";
import HrmsUser from "../hrms/models/User";
import catchAsync from "../utils/catchAsync";

// Super Admin's platform-wide reporting suite — pulls together CA firm
// licensing, business client HRMS subscriptions, staff headcount and
// employee counts into one place. Deliberately stays at aggregate/summary
// level for business-client and employee data (Role Matrix: "Super Admin has
// no default access to any tenant's operational data") — the same boundary
// getBusinessClientSummary/listBusinessClientsForSuperAdmin already draw.
// HRMS operational reports (attendance, payroll runs, leave, ...) are out of
// scope here on purpose; this only surfaces registration/plan/headcount
// numbers that already exist on the CA-Management side.

const CA_STATUSES = ["trial", "active", "suspended", "expired"];
const CA_TIERS = ["starter", "growth", "enterprise"];
const PERIODS = ["today", "weekly", "monthly", "yearly"];

function toObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

// Turns the Reports page's period filter (today/weekly/monthly/yearly) into a
// createdAt lower bound. Returns null for an absent/unrecognized period, which
// callers treat as "all time" (today's default, unfiltered behaviour).
function getPeriodStart(period) {
  if (!PERIODS.includes(period)) return null;
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "weekly": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start.setDate(start.getDate() - 6);
      return start;
    }
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "yearly":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

// Last 6 calendar months (including the current one), oldest first, with
// zero-filled gaps — mirrors dashboardController.getSignupTrend but reusable
// across any model/date field.
async function getMonthlyTrend(Model, dateField = "createdAt") {
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const rows = await Model.aggregate([
    { $match: { [dateField]: { $gte: rangeStart } } },
    { $group: { _id: { year: { $year: `$${dateField}` }, month: { $month: `$${dateField}` } }, count: { $sum: 1 } } },
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

// Headline numbers + breakdowns + 6-month trend — the "at a glance" hero
// section of the Reports page.
export const getReportsOverview = catchAsync(async (req, res) => {
  const periodStart = getPeriodStart(req.query.period as string);
  const createdFilter = periodStart ? { createdAt: { $gte: periodStart } } : {};

  const [
    totalCaFirms,
    firmsByStatusRows,
    firmsByTierRows,
    totalBusinessClients,
    clientsUsingHrms,
    totalCaFirmAdmins,
    totalCaFirmStaff,
    nonHrmsEmployeeCount,
    hrmsCompanies,
    hrmsEmployeeCount,
    firmSignupTrend,
    clientSignupTrend,
  ] = await Promise.all([
    CaFirm.countDocuments(createdFilter),
    CaFirm.aggregate([{ $match: createdFilter }, { $group: { _id: "$plan.status", count: { $sum: 1 } } }]),
    CaFirm.aggregate([{ $match: createdFilter }, { $group: { _id: "$plan.tier", count: { $sum: 1 } } }]),
    BusinessClient.countDocuments(createdFilter),
    BusinessClient.countDocuments({ ...createdFilter, useHrms: true }),
    User.countDocuments({ ...createdFilter, role: "ca_firm_admin" }),
    User.countDocuments({ ...createdFilter, role: "ca_firm_staff" }),
    ClientEmployee.countDocuments(createdFilter),
    HrmsCompany.find(createdFilter).select("subscriptionPlan planTier"),
    HrmsUser.countDocuments({ ...createdFilter, isCaProxy: { $ne: true } }),
    getMonthlyTrend(CaFirm),
    getMonthlyTrend(BusinessClient),
  ]);

  const firmsByStatus = Object.fromEntries(CA_STATUSES.map((s) => [s, 0]));
  firmsByStatusRows.forEach((r) => {
    if (r._id) firmsByStatus[r._id] = r.count;
  });

  const firmsByTier = Object.fromEntries(CA_TIERS.map((t) => [t, 0]));
  firmsByTierRows.forEach((r) => {
    if (r._id) firmsByTier[r._id] = r.count;
  });

  const clientsByHrmsPlan = {};
  const hrmsSubscriptions = { active: 0, trial: 0, expired: 0 };
  for (const c of hrmsCompanies) {
    const tier = c.planTier || "Unassigned";
    clientsByHrmsPlan[tier] = (clientsByHrmsPlan[tier] || 0) + 1;
    if (c.subscriptionPlan === "ACTIVE") hrmsSubscriptions.active += 1;
    else if (c.subscriptionPlan === "TRIAL") hrmsSubscriptions.trial += 1;
    else hrmsSubscriptions.expired += 1;
  }

  const signupTrend = firmSignupTrend.map((f, i) => ({
    month: f.month,
    caFirms: f.count,
    businessClients: clientSignupTrend[i]?.count || 0,
  }));

  res.json({
    success: true,
    data: {
      period: PERIODS.includes(req.query.period as string) ? req.query.period : null,
      totals: {
        caFirms: totalCaFirms,
        businessClients: totalBusinessClients,
        caFirmAdmins: totalCaFirmAdmins,
        caFirmStaff: totalCaFirmStaff,
        caStaff: totalCaFirmAdmins + totalCaFirmStaff,
        employees: nonHrmsEmployeeCount + hrmsEmployeeCount,
      },
      firmsByStatus,
      firmsByTier,
      clientsByHrmsPlan,
      clientsByUsage: { hrms: clientsUsingHrms, excel: totalBusinessClients - clientsUsingHrms },
      staffByRole: { admins: totalCaFirmAdmins, staff: totalCaFirmStaff },
      employeesBySource: { hrms: hrmsEmployeeCount, excel: nonHrmsEmployeeCount },
      hrmsSubscriptions,
      signupTrend,
    },
  });
});

// Per-CA-firm drill-down: plan, admin, roll-up counts, AND — nested one level
// down — every Business Client under that firm with its own HRMS plan and
// real employee headcount. Powers the Reports page's expandable "CA Firms"
// hierarchy (firm -> its business clients -> employees), not just flat totals.
export const getCaFirmsReport = catchAsync(async (req, res) => {
  const periodStart = getPeriodStart(req.query.period as string);
  const createdFilter = periodStart ? { createdAt: { $gte: periodStart } } : {};

  const [firms, admins, clients, staffCountRows, nonHrmsEmployeeRows] = await Promise.all([
    CaFirm.find(createdFilter).select("name plan isActive createdAt").sort({ createdAt: -1 }).lean(),
    User.find({ role: "ca_firm_admin" }).select("name email caFirmId").lean(),
    BusinessClient.find().select("name caFirmId hrmsCompanyId useHrms isActive").lean(),
    User.aggregate([{ $match: { role: "ca_firm_staff" } }, { $group: { _id: "$caFirmId", count: { $sum: 1 } } }]),
    ClientEmployee.aggregate([{ $group: { _id: "$businessClientId", count: { $sum: 1 } } }]),
  ]);

  const hrmsCompanyObjectIds = clients.map((c) => toObjectId(c.hrmsCompanyId)).filter(Boolean);
  const [companies, hrmsEmployeeRows] = await Promise.all([
    HrmsCompany.find({ _id: { $in: hrmsCompanyObjectIds } })
      .select("planTier subscriptionStatus subscriptionEndDate")
      .lean(),
    hrmsCompanyObjectIds.length
      ? HrmsUser.aggregate([
          { $match: { isCaProxy: { $ne: true }, companyId: { $in: hrmsCompanyObjectIds } } },
          { $group: { _id: "$companyId", count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
  ]);

  const adminByFirm = new Map(admins.map((a) => [String(a.caFirmId), a]));
  const staffCountByFirm = new Map(staffCountRows.map((r) => [String(r._id), r.count]));
  const companyById = new Map(companies.map((c) => [String(c._id), c]));
  const nonHrmsCountByClient = new Map(nonHrmsEmployeeRows.map((r) => [String(r._id), r.count]));
  const hrmsCountByCompany = new Map(hrmsEmployeeRows.map((r) => [String(r._id), r.count]));

  const clientsByFirm = new Map();
  for (const c of clients) {
    const company = c.hrmsCompanyId ? companyById.get(String(c.hrmsCompanyId)) : null;
    const employeeCount = c.hrmsCompanyId
      ? hrmsCountByCompany.get(String(c.hrmsCompanyId)) || 0
      : nonHrmsCountByClient.get(String(c._id)) || 0;
    const entry = {
      _id: c._id,
      name: c.name,
      useHrms: c.useHrms,
      isActive: c.isActive,
      planTier: company?.planTier || null,
      subscriptionStatus: company?.subscriptionStatus || null,
      employeeCount,
    };
    const key = String(c.caFirmId);
    if (!clientsByFirm.has(key)) clientsByFirm.set(key, []);
    clientsByFirm.get(key).push(entry);
  }

  const data = firms.map((firm) => {
    const id = String(firm._id);
    const admin = adminByFirm.get(id);
    const businessClients = (clientsByFirm.get(id) || []).sort((a, b) => b.employeeCount - a.employeeCount);
    const employeeCount = businessClients.reduce((sum, c) => sum + c.employeeCount, 0);
    return {
      _id: firm._id,
      name: firm.name,
      plan: firm.plan,
      isActive: firm.isActive,
      createdAt: firm.createdAt,
      adminName: admin?.name || null,
      adminEmail: admin?.email || null,
      staffCount: staffCountByFirm.get(id) || 0,
      businessClientCount: businessClients.length,
      employeeCount,
      businessClients,
    };
  });

  res.json({ success: true, data });
});

// Per-business-client drill-down: owning firm, HRMS plan, and real employee
// headcount (ClientEmployee for Excel-based clients, HRMS user count for the rest).
export const getBusinessClientsReport = catchAsync(async (req, res) => {
  const periodStart = getPeriodStart(req.query.period as string);
  const createdFilter = periodStart ? { createdAt: { $gte: periodStart } } : {};

  const clients = await BusinessClient.find(createdFilter)
    .select("name useHrms hrmsCompanyId isActive caFirmId createdAt")
    .populate("caFirmId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const hrmsCompanyObjectIds = clients.map((c) => toObjectId(c.hrmsCompanyId)).filter(Boolean);

  const [companies, nonHrmsCounts, hrmsCounts] = await Promise.all([
    HrmsCompany.find({ _id: { $in: hrmsCompanyObjectIds } })
      .select("planTier subscriptionPlan subscriptionStatus subscriptionEndDate")
      .lean(),
    ClientEmployee.aggregate([{ $group: { _id: "$businessClientId", count: { $sum: 1 } } }]),
    hrmsCompanyObjectIds.length
      ? HrmsUser.aggregate([
          { $match: { isCaProxy: { $ne: true }, companyId: { $in: hrmsCompanyObjectIds } } },
          { $group: { _id: "$companyId", count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
  ]);

  const companyById = new Map(companies.map((c) => [String(c._id), c]));
  const nonHrmsCountByClient = new Map(nonHrmsCounts.map((r) => [String(r._id), r.count]));
  const hrmsCountByCompany = new Map(hrmsCounts.map((r) => [String(r._id), r.count]));

  const data = clients.map((c) => {
    const company = c.hrmsCompanyId ? companyById.get(String(c.hrmsCompanyId)) : null;
    const employeeCount = c.hrmsCompanyId
      ? hrmsCountByCompany.get(String(c.hrmsCompanyId)) || 0
      : nonHrmsCountByClient.get(String(c._id)) || 0;
    return {
      _id: c._id,
      name: c.name,
      caFirmName: (c.caFirmId as any)?.name || "—",
      useHrms: c.useHrms,
      isActive: c.isActive,
      planTier: company?.planTier || null,
      subscriptionPlan: company?.subscriptionPlan || null,
      subscriptionStatus: company?.subscriptionStatus || null,
      subscriptionEndDate: company?.subscriptionEndDate || null,
      employeeCount,
      createdAt: c.createdAt,
    };
  });

  res.json({ success: true, data });
});

// Combined subscription health across both tenant tiers — CA firm licences
// and business client HRMS subscriptions — with a merged "expiring soon"
// list so Super Admin doesn't have to check two separate pages.
export const getSubscriptionsReport = catchAsync(async (req, res) => {
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [firms, admins, clients] = await Promise.all([
    CaFirm.find().select("name plan createdAt").sort({ "plan.expiryDate": 1 }).lean(),
    User.find({ role: "ca_firm_admin" }).select("name email caFirmId").lean(),
    BusinessClient.find({ useHrms: true, hrmsCompanyId: { $ne: null } })
      .select("name caFirmId hrmsCompanyId")
      .populate("caFirmId", "name")
      .lean(),
  ]);

  const adminByFirm = new Map(admins.map((a) => [String(a.caFirmId), a]));

  const hrmsCompanyObjectIds = clients.map((c) => toObjectId(c.hrmsCompanyId)).filter(Boolean);
  const companies = await HrmsCompany.find({ _id: { $in: hrmsCompanyObjectIds } })
    .select("planTier subscriptionPlan subscriptionStatus subscriptionEndDate")
    .lean();
  const companyById = new Map(companies.map((c) => [String(c._id), c]));

  const caFirmSubscriptions = firms.map((firm) => {
    const admin = adminByFirm.get(String(firm._id));
    const expiryDate = firm.plan?.expiryDate || null;
    const daysLeft = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / 86400000) : null;
    return {
      _id: firm._id,
      firmName: firm.name,
      adminName: admin?.name || null,
      adminEmail: admin?.email || null,
      planTier: firm.plan?.tier,
      status: firm.plan?.status,
      billingCycle: firm.plan?.billingCycle,
      expiryDate,
      daysLeft,
    };
  });

  const businessClientSubscriptions = clients
    .map((c) => {
      const company = c.hrmsCompanyId ? companyById.get(String(c.hrmsCompanyId)) : null;
      if (!company) return null;
      const expiryDate = company.subscriptionEndDate || null;
      const daysLeft = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / 86400000) : null;
      return {
        _id: c._id,
        clientName: c.name,
        firmName: (c.caFirmId as any)?.name || "—",
        planTier: company.planTier,
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: company.subscriptionStatus,
        expiryDate,
        daysLeft,
      };
    })
    .filter(Boolean);

  // No lower bound on daysLeft — an already-overdue firm sitting in the 7-day
  // grace period (see licenceGrace.ts) is more urgent than one with 14 days
  // left, so it belongs at the top of this list, not excluded from it.
  const expiringSoon = [
    ...caFirmSubscriptions
      .filter((f) => f.expiryDate && new Date(f.expiryDate) <= thirtyDaysOut)
      .map((f) => ({ type: "ca_firm", name: f.firmName, planTier: f.planTier, expiryDate: f.expiryDate, daysLeft: f.daysLeft })),
    ...businessClientSubscriptions
      .filter((c: any) => c.expiryDate && new Date(c.expiryDate) <= thirtyDaysOut)
      .map((c: any) => ({ type: "business_client", name: c.clientName, planTier: c.planTier, expiryDate: c.expiryDate, daysLeft: c.daysLeft })),
  ].sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  res.json({
    success: true,
    data: { caFirmSubscriptions, businessClientSubscriptions, expiringSoon },
  });
});
