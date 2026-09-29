/** @format */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getPayrollApprovalMeta,
  verifyPayrollApprovalPassword,
  getPayrollApprovalData,
  approvePayrollRun,
} from "../controllers/hrms/payrollApprovalController";

// Unauthenticated by design — mounted without authMiddleware/subscriptionMiddleware
// in root.routes.ts. Every route here is scoped by the :token in the URL
// (PayrollRun.approvalToken), never by a logged-in HRMS session. Mirrors
// CA-Backend/routes/publicBusinessClientRoutes.ts.
const router = Router();

// The password is the only real barrier between this link and a company's
// payroll figures, so this is stricter than a normal login limiter.
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});

const approveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});

router.get("/:token", getPayrollApprovalMeta);
router.post("/:token/verify", verifyLimiter, verifyPayrollApprovalPassword);
router.get("/:token/data", getPayrollApprovalData);
router.post("/:token/approve", approveLimiter, approvePayrollRun);

export default router;
