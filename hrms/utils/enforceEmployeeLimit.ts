import Company from "../models/hrms/Company";
import User from "../models/User";

// A company's employeeLimit comes from its HRMS plan tier (see HrmsPlanTier /
// saasController.ts's verifyTierPayment). Companies that have never picked a
// tier still have employeeLimit: 0 (unset) — treated as "not yet limited"
// rather than "zero employees allowed", so pre-existing trials keep working.
export async function getEmployeeLimitStatus(companyId: string) {
  const company = await Company.findById(companyId).select("employeeLimit planTier name");
  if (!company || !company.employeeLimit) return { limited: false as const };

  const current = await User.countDocuments({ companyId, status: "ACTIVE" });
  return {
    limited: true as const,
    limit: company.employeeLimit,
    current,
    planTier: company.planTier as string | undefined,
    companyName: company.name as string,
  };
}

export function employeeLimitErrorMessage(planTier: string | undefined, limit: number) {
  return `Your ${planTier || "current"} plan allows up to ${limit} employee${limit === 1 ? "" : "s"}. Upgrade your plan to add more.`;
}
