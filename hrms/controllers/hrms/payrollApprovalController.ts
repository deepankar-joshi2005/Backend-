/** @format */

// Public (no authMiddleware) controller powering the payroll owner-approval
// email link. Mirrors the "link token unlocks a page -> a secret unlocks a
// short-lived scoped JWT -> that JWT authorizes one action" shape already
// used by publicEmployeeFormController.ts / employeeFormToken.ts.
import { Response } from "express";
import bcrypt from "bcrypt";
import PayrollRun from "../../models/hrms/PayrollRun";
import Company from "../../models/hrms/Company";
import { ROLES } from "../../constants";
import { AuthRequest } from "../../middleware/auth";
import { signPayrollApprovalAccessToken, verifyPayrollApprovalAccessToken } from "../../utils/payrollApprovalToken";
import { runPayrollForMonth } from "./payrollController";
import { buildPayrollRunEntries } from "./payrollRunController";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Shared by every step below — a token is only ever useful while its run is
// still "PendingOwnerApproval" and unexpired; once approved (or expired) the
// same generic error is returned for both "wrong token" and "already used"
// so a stale/forwarded link can't be used to probe whether payroll exists.
async function loadPendingRunByToken(token: string) {
  const run = await PayrollRun.findOne({ approvalToken: token });
  if (!run) throw new HttpError(404, "This link is invalid or no longer active");
  if (run.status !== "PendingOwnerApproval" || !run.approvalTokenExpiry || run.approvalTokenExpiry < new Date()) {
    throw new HttpError(410, "This approval link has expired or has already been used.");
  }
  return run;
}

function getScopedAccessPayload(req: AuthRequest, run: { _id: any }) {
  const header = req.headers["x-payroll-approval-token"];
  if (!header || typeof header !== "string") {
    throw new HttpError(401, "Missing or expired approval session — please re-enter your password");
  }
  let payload: { payrollRunId: string; companyId: string; month: string };
  try {
    payload = verifyPayrollApprovalAccessToken(header);
  } catch {
    throw new HttpError(401, "Your session has expired — please re-enter your password");
  }
  if (payload.payrollRunId !== String(run._id)) {
    throw new HttpError(403, "This session does not match this payroll approval link");
  }
  return payload;
}

// Step 1: unauthenticated — just enough to brand the password-gate page.
// Deliberately reveals no financial data.
export const getPayrollApprovalMeta = async (req: AuthRequest, res: Response) => {
  try {
    const run = await loadPendingRunByToken(String(req.params.token));
    const company = await Company.findById(run.companyId).select("name").lean();
    res.json({
      success: true,
      data: {
        companyName: company?.name || "",
        month: run.month,
        expiresAt: run.approvalTokenExpiry,
      },
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : "Failed to load approval link" });
  }
};

// Step 2: the owner enters their payroll-approval password — this is the
// "password" for this link (separate from any HRMS login).
export const verifyPayrollApprovalPassword = async (req: AuthRequest, res: Response) => {
  try {
    const run = await loadPendingRunByToken(String(req.params.token));
    const password = String(req.body.password || "");
    if (!password) throw new HttpError(400, "Password is required");

    const company = await Company.findById(run.companyId).select("+ownerPasswordHash ownerEmail");
    if (!company?.ownerPasswordHash) throw new HttpError(404, "This link is invalid or no longer active");

    const match = await bcrypt.compare(password, company.ownerPasswordHash);
    if (!match) throw new HttpError(401, "Incorrect password");

    const accessToken = signPayrollApprovalAccessToken(String(run._id), String(run.companyId), run.month);
    res.json({ success: true, data: { accessToken, expiresIn: "30m" } });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : "Failed to verify password" });
  }
};

// Step 3: same employee-wise data + totals HR sees on "View Payroll" for this
// month — computed live (nothing persisted yet), via the exact same engine.
export const getPayrollApprovalData = async (req: AuthRequest, res: Response) => {
  try {
    const run = await loadPendingRunByToken(String(req.params.token));
    getScopedAccessPayload(req, run);

    const scopedReq = {
      user: { companyId: run.companyId, role: ROLES.HRAdmin, isSystemAdmin: false, isCaProxy: false },
    } as unknown as AuthRequest;

    const { entries, summary, isLivePreview } = await buildPayrollRunEntries(scopedReq, run.month, run as any);
    res.json({ success: true, data: { run, summary, entries, isLivePreview } });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : "Failed to load payroll data" });
  }
};

// Step 4: owner approves — payroll actually runs now (persisted), same
// calculation/persistence engine HR's own "Run Payroll" uses. Token is
// single-use: cleared immediately after.
export const approvePayrollRun = async (req: AuthRequest, res: Response) => {
  try {
    const run = await loadPendingRunByToken(String(req.params.token));
    getScopedAccessPayload(req, run);

    const company = await Company.findById(run.companyId).select("ownerEmail").lean();

    const scopedReq = {
      user: { companyId: run.companyId, role: ROLES.HRAdmin, isSystemAdmin: false, isCaProxy: false },
    } as unknown as AuthRequest;

    await runPayrollForMonth(scopedReq, run.month, [String(run.companyId)]);

    run.status = "Processing";
    run.generatedBy = "Company";
    run.ownerApprovedAt = new Date();
    run.ownerApprovedByEmail = company?.ownerEmail || null;
    run.approvalToken = null;
    run.approvalTokenExpiry = null;
    await run.save();

    res.json({ success: true, message: "Payroll approved and is now processing." });
  } catch (error: any) {
    console.error(error);
    if (error.message === "No employees with a salary structure found for this month") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : "Failed to approve payroll" });
  }
};
