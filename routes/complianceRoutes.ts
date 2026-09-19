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
import { validate } from "../middleware/validateRequest";
import { requireActiveFirm } from "../middleware/requireActiveFirm";
import { complianceUpload } from "../utils/complianceUpload";
import { createTaskSchema, updateTaskSchema, addTaskNoteSchema } from "../validators/complianceValidators";

const router = express.Router();

router.use(protect, authorize("ca_firm_admin", "ca_firm_staff"));

router.get("/dashboard", getComplianceDashboard);
router.get("/tasks", listTasks);
router.post("/tasks", requireActiveFirm, validate(createTaskSchema), createTask);
router.put("/tasks/:id", requireActiveFirm, validate(updateTaskSchema), updateTask);
router.delete("/tasks/:id", authorize("ca_firm_admin"), requireActiveFirm, deleteTask);
router.post("/tasks/:id/notes", requireActiveFirm, validate(addTaskNoteSchema), addTaskNote);
router.post("/tasks/:id/documents", requireActiveFirm, complianceUpload.single("file"), uploadTaskDocument);

export default router;
