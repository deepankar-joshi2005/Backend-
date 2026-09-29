import jwt from "jsonwebtoken";

// Short-lived, purpose-scoped token proving a Business Client owner has just
// verified their payroll-approval password for one specific PayrollRun.
// Deliberately separate from real HRMS login tokens (utils/jwt.ts) — this
// never represents an authenticated User, only "may view and approve this
// one month's payroll for the next little while". Mirrors
// CA-Backend/utils/employeeFormToken.ts.
const EXPIRES_IN = "30m";

export function signPayrollApprovalAccessToken(payrollRunId: string, companyId: string, month: string) {
  return jwt.sign(
    { payrollRunId, companyId, month, purpose: "payroll_approval" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

export function verifyPayrollApprovalAccessToken(
  token: string
): { payrollRunId: string; companyId: string; month: string } {
  const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  if (payload.purpose !== "payroll_approval" || !payload.payrollRunId || !payload.companyId || !payload.month) {
    throw new Error("Invalid payroll approval token");
  }
  return payload;
}
