"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payrollController_1 = require("../../controllers/hrms/payrollController");
const payrollRunController_1 = require("../../controllers/hrms/payrollRunController");
const auth_1 = require("../../middleware/auth");
const PayrollRouter = (0, express_1.Router)();
/* PAYROLL RUNS (month-level) — declared before "/:id" routes to avoid collisions */
PayrollRouter.get("/runs", auth_1.authMiddleware, payrollRunController_1.listPayrollRuns);
PayrollRouter.get("/runs/:month", auth_1.authMiddleware, payrollRunController_1.getPayrollRunDetail);
PayrollRouter.post("/runs/:month/run", auth_1.authMiddleware, payrollRunController_1.runPayrollRunForMonth);
PayrollRouter.patch("/runs/:month/schedule", auth_1.authMiddleware, payrollRunController_1.updatePayrollRunSchedule);
PayrollRouter.patch("/runs/:month/cancel", auth_1.authMiddleware, payrollRunController_1.cancelPayrollRunForMonth);
/* HR / FINANCE */
PayrollRouter.get("/", auth_1.authMiddleware, payrollController_1.getPayrollByMonth);
PayrollRouter.get("/preview", auth_1.authMiddleware, payrollController_1.getPayrollPreview);
PayrollRouter.post("/run", auth_1.authMiddleware, payrollController_1.savePayroll);
PayrollRouter.patch("/pay-all", auth_1.authMiddleware, payrollController_1.payAllPayroll);
PayrollRouter.patch("/:id/status", auth_1.authMiddleware, payrollController_1.updatePayrollStatus);
PayrollRouter.delete("/reset", payrollController_1.resetPayrollByMonth);
PayrollRouter.patch("/:id/reject", payrollController_1.rejectPayroll);
PayrollRouter.post("/recalculate", payrollController_1.recalculatePayroll);
exports.default = PayrollRouter;
