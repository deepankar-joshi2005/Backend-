/** @format */

import { Router } from "express";
import {
  generatePayslipsFromPayroll,
  getAllPayslips,
  getPayslipDetail,
  downloadPayslipPDF,
  sendPayslipToEmployee,
  getMyPayslips,
  deleteAllPayslips,
} from "../../controllers/hrms/payslipController";
import { authMiddleware } from "../../middleware/auth";

const PayslipRouter = Router();

/* ================= HR / ADMIN ================= */

// Payroll se payslip generate karega (MONTH wise)
PayslipRouter.post(
  "/generate-from-payroll",
  authMiddleware,
  generatePayslipsFromPayroll
);

// HR: sab payslips dekhega
PayslipRouter.get("/", authMiddleware, getAllPayslips);

// HR: single payslip detail (Pay Stub panel breakdown)
PayslipRouter.get("/:id/detail", authMiddleware, getPayslipDetail);

// HR: PDF download
PayslipRouter.get("/:id/download", authMiddleware, downloadPayslipPDF);

// HR: Send payslip to employee
PayslipRouter.post("/:id/send", authMiddleware, sendPayslipToEmployee);

/* ================= EMPLOYEE ================= */

// Employee: apni payslips dekhega
PayslipRouter.get("/me/my-payslips", authMiddleware, getMyPayslips);
PayslipRouter.delete("/cleanup",deleteAllPayslips);

export default PayslipRouter;
