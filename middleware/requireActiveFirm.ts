import CaFirm from "../models/CaFirm";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { getGraceInfo } from "../utils/licenceGrace";

// Blocks Tier-2 (CA Firm Admin/Staff) write access once their firm is suspended, or
// its subscription has expired AND the 7-day grace period (Multi-Tenancy & Licensing
// doc, Section 7) has elapsed — expiry alone still leaves full access intact. Tier 3
// (business client) users are never gated here — their HRMS access must survive the
// parent firm's lapse entirely. Apply this to every CRM/Compliance/Loan Calculator
// route as those modules are built; login and read-only status checks (e.g.
// /ca-firms/my-plan) must stay outside this gate so a locked-out admin can still see
// *why* they're locked out.
export const requireActiveFirm = catchAsync(async (req, res, next) => {
  if (!["ca_firm_admin", "ca_firm_staff"].includes(req.user.role)) return next();

  const firm = await CaFirm.findById(req.user.caFirmId).select("isActive plan.status plan.expiryDate");
  if (!firm) throw new ApiError(404, "CA firm not found");

  if (!firm.isActive) {
    throw new ApiError(403, "Your firm's account has been suspended. Contact the platform administrator.");
  }
  if (firm.plan.status === "suspended") {
    throw new ApiError(403, "Your firm's subscription has ended. Renew your plan to continue.");
  }
  if (getGraceInfo(firm.plan).isReadOnly) {
    throw new ApiError(403, "Your firm's subscription has ended. Renew your plan to continue.");
  }

  next();
});
