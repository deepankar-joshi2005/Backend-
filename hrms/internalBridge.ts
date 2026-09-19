// Plain, directly-callable versions of the CA-Management <-> HRMS bridge
// operations. Originally these were only reachable over HTTP (from when HRMS
// ran as a separate service); now that both are one process, CA-Backend's own
// controllers call these functions in-process instead of making a self-referential
// fetch() to their own server — which is both faster and avoids a real hang seen
// under load with self-connections on some environments.
import bcrypt from "bcrypt";
import Company from "./models/hrms/Company";
import User from "./models/User";
import { ROLES } from "./constants";
import { generateToken } from "./utils/jwt";
import { seedDefaultDocumentTypesForCompany } from "./controllers/hrms/documentTypeController";

export async function provisionCompanyForCa({
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
  if (!companyName || !adminName || !adminEmail || !adminPasswordHash || !caFirmId) {
    throw new Error("Required fields missing");
  }

  const existingUser = await User.findOne({ email: adminEmail });
  if (existingUser) throw new Error("Admin email already registered in HRMS");

  const now = new Date();
  const prefix = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastCompany = await Company.findOne({ companyId: new RegExp(`^${prefix}`) }).sort({ companyId: -1 });
  let runningNumber = 1;
  if (lastCompany?.companyId) {
    runningNumber = parseInt(lastCompany.companyId.slice(4)) + 1;
  }
  const companyId = prefix + String(runningNumber).padStart(4, "0");

  const company = new Company({
    companyId,
    name: companyName,
    email: adminEmail,
    phone: adminPhone || "",
    caFirmId,
    caFirmName,
    subscriptionPlan: "ACTIVE",
    subscriptionStatus: "PAID",
    subscriptionEndDate: new Date(now.getFullYear() + 10, now.getMonth(), now.getDate()),
    employeeLimit: employeeLimit || 0,
    planTier: planTier || null,
  });
  await company.save();

  const admin = new User({
    employeeId: `${companyId}-001`,
    name: adminName,
    email: adminEmail,
    password: adminPasswordHash,
    mobile: adminPhone || "0000000000",
    role: ROLES.SuperAdmin,
    companyId: company._id,
    isVerified: true,
    status: "ACTIVE",
    gender: "Other",
    dob: new Date(),
    joiningDate: new Date(),
  });
  await admin.save();

  company.createdBy = admin._id;
  await company.save();

  await seedDefaultDocumentTypesForCompany(company._id);

  return { hrmsCompanyId: company._id, hrmsCompanyCode: company.companyId };
}

export async function issueSsoTokenFor(email: string) {
  if (!email) throw new Error("Email is required");
  const user = await User.findOne({ email });
  if (!user) throw new Error("No HRMS account for this email");
  if (user.status !== "ACTIVE") throw new Error("This HRMS account is not active");
  return generateToken({ id: user._id, role: user.role });
}

// Lets CA Firm Admin/Staff (who have no HRMS account of their own) open a
// Business Client's real HRMS Payroll screens and act on its behalf, without
// impersonating the client's own admin (which would make CA-run payroll
// indistinguishable from the client's own). Finds or lazily creates one
// synthetic, password-less company-admin User per company, flagged
// isCaProxy so payroll runs triggered through it can be attributed to "CA".
export async function issueCaProxySsoToken(hrmsCompanyId: string) {
  if (!hrmsCompanyId) throw new Error("hrmsCompanyId is required");
  const company = await Company.findById(hrmsCompanyId);
  if (!company) throw new Error("HRMS company not found");

  let proxyUser = await User.findOne({ companyId: company._id, isCaProxy: true });
  if (!proxyUser) {
    proxyUser = new User({
      employeeId: `${company.companyId}-CAPROXY`,
      name: "CA Firm (Payroll Access)",
      email: `ca-proxy+${company._id}@internal.hrms`,
      mobile: "0000000000",
      role: ROLES.SuperAdmin,
      companyId: company._id,
      isVerified: true,
      isCaProxy: true,
      status: "ACTIVE",
      gender: "Other",
      dob: new Date(2000, 0, 1),
      joiningDate: new Date(),
    });
    await proxyUser.save();
  }
  if (proxyUser.status !== "ACTIVE") throw new Error("CA proxy account for this company is not active");

  return generateToken({ id: proxyUser._id, role: proxyUser.role });
}

export async function verifyHrmsCredentials(email: string, password: string) {
  if (!email || !password) return { valid: false as const };
  const user = await User.findOne({ email });
  if (!user || !user.password) return { valid: false as const };
  const match = await bcrypt.compare(password, user.password);
  if (!match) return { valid: false as const };
  if (user.status !== "ACTIVE") return { valid: false as const };
  const token = generateToken({ id: user._id, role: user.role });
  return { valid: true as const, token };
}
