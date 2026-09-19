/** @format */

import { Router } from "express";
import {
  getPayrollByMonth,
  savePayroll,
  updatePayrollStatus,
  payAllPayroll,
  resetPayrollByMonth,
  rejectPayroll,
  recalculatePayroll,
  getPayrollPreview
} from "../../controllers/hrms/payrollController";
import {
  listPayrollRuns,
  getPayrollRunDetail,
  updatePayrollRunSchedule,
  runPayrollRunForMonth,
  cancelPayrollRunForMonth,
} from "../../controllers/hrms/payrollRunController";
import { authMiddleware } from "../../middleware/auth";
const PayrollRouter = Router();

/* PAYROLL RUNS (month-level) — declared before "/:id" routes to avoid collisions */
PayrollRouter.get("/runs", authMiddleware, listPayrollRuns);
PayrollRouter.get("/runs/:month", authMiddleware, getPayrollRunDetail);
PayrollRouter.post("/runs/:month/run", authMiddleware, runPayrollRunForMonth);
PayrollRouter.patch("/runs/:month/schedule", authMiddleware, updatePayrollRunSchedule);
PayrollRouter.patch("/runs/:month/cancel", authMiddleware, cancelPayrollRunForMonth);

/* HR / FINANCE */
PayrollRouter.get("/", authMiddleware, getPayrollByMonth);
PayrollRouter.get("/preview", authMiddleware, getPayrollPreview);
PayrollRouter.post("/run", authMiddleware, savePayroll);
PayrollRouter.patch("/pay-all", authMiddleware, payAllPayroll);
PayrollRouter.patch("/:id/status", authMiddleware, updatePayrollStatus);
PayrollRouter.delete("/reset", resetPayrollByMonth);
PayrollRouter.patch("/:id/reject",rejectPayroll);
PayrollRouter.post("/recalculate",recalculatePayroll);
export default PayrollRouter;
