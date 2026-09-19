"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payslipController_1 = require("../../controllers/hrms/payslipController");
const auth_1 = require("../../middleware/auth");
const PayslipRouter = (0, express_1.Router)();
/* ================= HR / ADMIN ================= */
// Payroll se payslip generate karega (MONTH wise)
PayslipRouter.post("/generate-from-payroll", auth_1.authMiddleware, payslipController_1.generatePayslipsFromPayroll);
// HR: sab payslips dekhega
PayslipRouter.get("/", auth_1.authMiddleware, payslipController_1.getAllPayslips);
// HR: single payslip detail (Pay Stub panel breakdown)
PayslipRouter.get("/:id/detail", auth_1.authMiddleware, payslipController_1.getPayslipDetail);
// HR: PDF download
PayslipRouter.get("/:id/download", auth_1.authMiddleware, payslipController_1.downloadPayslipPDF);
// HR: Send payslip to employee
PayslipRouter.post("/:id/send", auth_1.authMiddleware, payslipController_1.sendPayslipToEmployee);
/* ================= EMPLOYEE ================= */
// Employee: apni payslips dekhega
PayslipRouter.get("/me/my-payslips", auth_1.authMiddleware, payslipController_1.getMyPayslips);
PayslipRouter.delete("/cleanup", payslipController_1.deleteAllPayslips);
exports.default = PayslipRouter;
