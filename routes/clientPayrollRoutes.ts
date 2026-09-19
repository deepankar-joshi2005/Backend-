import express from "express";
import multer from "multer";
import {
  getSettings,
  updateSettings,
  updateComponentPercentages,
  downloadTemplate,
  getStructureForMonth,
  previewStructureUpload,
  confirmStructureUpload,
  updateCostCenter,
  updateEmployeeStructure,
  saveStructureForMonth,
  generatePayroll,
  runPayroll,
  listRuns,
  getRunDetail,
  exportRun,
  downloadPayslip,
} from "../controllers/clientPayrollController";

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
router.get("/structure/:month", getStructureForMonth);
router.post("/structure/:month/upload/preview", upload.single("file"), previewStructureUpload);
router.post("/structure/:month/upload/confirm", confirmStructureUpload);
router.put("/structure/:month/cost-center", updateCostCenter);
router.put("/structure/:month/employees/:employeeId", updateEmployeeStructure);
router.post("/structure/:month/save", saveStructureForMonth);

router.post("/:month/generate", generatePayroll);
router.post("/:month/run", runPayroll);

router.get("/", listRuns);
router.get("/:month", getRunDetail);
router.get("/:month/export", exportRun);
router.get("/:month/entries/:employeeId/payslip", downloadPayslip);

export default router;
