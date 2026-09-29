import express from "express";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  addTaskNote,
  uploadTaskDocument,
  getComplianceDashboard,
} from "../controllers/complianceController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { requireModulePermission } from "../middleware/requireModulePermission";
import { validate } from "../middleware/validateRequest";
import { requireActiveFirm } from "../middleware/requireActiveFirm";
import { complianceUpload } from "../utils/complianceUpload";
import { createTaskSchema, updateTaskSchema, addTaskNoteSchema } from "../validators/complianceValidators";

const router = express.Router();

router.use(protect, authorize("ca_firm_admin", "ca_firm_staff"));

router.get("/dashboard", requireModulePermission("compliance"), getComplianceDashboard);
router.get("/tasks", requireModulePermission("compliance"), listTasks);
router.post("/tasks", requireModulePermission("compliance", "add"), requireActiveFirm, validate(createTaskSchema), createTask);
router.put("/tasks/:id", requireModulePermission("compliance", "edit"), requireActiveFirm, validate(updateTaskSchema), updateTask);
router.delete("/tasks/:id", requireModulePermission("compliance", "delete"), requireActiveFirm, deleteTask);
router.post(
  "/tasks/:id/notes",
  requireModulePermission("compliance"),
  requireActiveFirm,
  validate(addTaskNoteSchema),
  addTaskNote
);
router.post(
  "/tasks/:id/documents",
  requireModulePermission("compliance"),
  requireActiveFirm,
  complianceUpload.single("file"),
  uploadTaskDocument
);

export default router;
