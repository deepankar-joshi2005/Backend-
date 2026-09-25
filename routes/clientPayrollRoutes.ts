import express from "express";
import multer from "multer";
import {
  getSettings,
  updateSettings,
  updateComponentPercentages,
  updateTemplateColumns,
  downloadTemplate,
  getStructureForMonth,
  previewStructureUpload,
  confirmStructureUpload,
  updateCostCenter,
  updateEmployeeStructure,
  deleteStructureRows,
  updateEmployeeComponentSettings,
  saveStructureForMonth,
  runPayroll,
  listRuns,
  getRunDetail,
  exportRun,
  downloadPayslip,
} from "../controllers/clientPayrollController";
import { getPaymentFile, generatePaymentFile, exportPaymentFile } from "../controllers/clientPaymentFileController";

const upload = multer({ storage: multer.memoryStorage() });

// mergeParams so :businessClientId from the parent mount (businessClientRoutes.ts)
// is visible here. Auth (protect/authorize/requireActiveFirm) is applied at the
// mount point in businessClientRoutes.ts, not per-route here.
const router = express.Router({ mergeParams: true });

router.get("/settings", getSettings);
router.put("/settings", updateSettings);

router.get("/template", downloadTemplate);

// Salary Structure — versioned per month. Registered before the generic
// "/:month" run-detail route below so "structure" is never mis-matched as a month value.
router.put("/structure/settings", updateComponentPercentages);
router.put("/structure/template-columns", updateTemplateColumns);
router.get("/structure/:month", getStructureForMonth);
router.post("/structure/:month/upload/preview", upload.single("file"), previewStructureUpload);
router.post("/structure/:month/upload/confirm", confirmStructureUpload);
router.put("/structure/:month/cost-center", updateCostCenter);
router.put("/structure/:month/employees/:employeeId", updateEmployeeStructure);
router.delete("/structure/:month/employees", deleteStructureRows);
router.put("/structure/:month/employees/:employeeId/component-settings", updateEmployeeComponentSettings);
// Saving the structure now generates payroll immediately (no separate
// "Generate" step) — see computePayrollForMonth in the controller.
router.post("/structure/:month/save", saveStructureForMonth);

router.post("/:month/run", runPayroll);

router.get("/", listRuns);
router.get("/:month", getRunDetail);
router.get("/:month/export", exportRun);
router.get("/:month/entries/:employeeId/payslip", downloadPayslip);

// Payment File — bank-ready NEFT/RTGS-style export, gated on that month's
// payroll run actually being generated/completed (never Draft).
router.get("/:month/payment-file", getPaymentFile);
router.post("/:month/payment-file/generate", generatePaymentFile);
router.get("/:month/payment-file/export", exportPaymentFile);

export default router;
