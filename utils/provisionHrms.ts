// HRMS is merged into this same process now (see hrms/ folder) — these call
// its internal functions directly instead of making an HTTP request to
// itself, which is both faster and avoids a real hang seen with self-referential
// fetch() calls under load in some environments.
import { provisionCompanyForCa, issueSsoTokenFor, issueCaProxySsoToken, verifyHrmsCredentials } from "../hrms/internalBridge";

// Creates the matching Company + admin account in HRMS for a newly onboarded
// Business Client. The admin's password hash travels as-is (both sides use
// bcrypt-compatible hashing) so the plaintext password is never duplicated —
// the User pre-save hook detects the existing "$2b$" hash and stores it as-is.
export async function provisionHrmsCompany({
  companyName,
  adminName,
  adminEmail,
  adminPasswordHash,
  adminPhone,
  caFirmId,
  caFirmName,
  employeeLimit,
  planTier,
}: {
  companyName: string;
  adminName: string;
  adminEmail: string;
  adminPasswordHash: string;
  adminPhone?: string;
  caFirmId: string;
  caFirmName?: string;
  employeeLimit?: number;
  planTier?: string;
}) {
  return provisionCompanyForCa({ companyName, adminName, adminEmail, adminPasswordHash, adminPhone, caFirmId, caFirmName, employeeLimit, planTier });
}

// Trades a verified email (the caller has already authenticated this user) for a
// real HRMS login token — lets a Business Client Admin/Employee who just logged
// into CA-Management land straight in their HRMS dashboard, no second login.
export async function getHrmsSsoToken(email: string) {
  return issueSsoTokenFor(email);
}

// Lets a CA Firm Admin/Staff member (who has no HRMS account) open a Business
// Client's real HRMS Payroll screens and run payroll on its behalf — see
// issueCaProxySsoToken for why this can't just reuse getHrmsSsoToken.
export async function getCaProxyHrmsSsoToken(hrmsCompanyId: string) {
  return issueCaProxySsoToken(hrmsCompanyId);
}

// Fallback for CA-Management's own login: an email it doesn't recognize might
// belong to an employee an HR Admin created directly inside HRMS (Manager,
// Finance, IT Admin, ...) — those never get a CA-Management account of their
// own. Checks the credentials against HRMS itself before giving up entirely.
export async function verifyHrmsLogin(email: string, password: string) {
  try {
    return await verifyHrmsCredentials(email, password);
  } catch {
    return { valid: false };
  }
}
