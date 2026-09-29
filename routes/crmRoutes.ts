import express from "express";
import {
  listLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  addLeadNote,
  getCrmDashboard,
} from "../controllers/crmController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { requireModulePermission } from "../middleware/requireModulePermission";
import { validate } from "../middleware/validateRequest";
import { requireActiveFirm } from "../middleware/requireActiveFirm";
import { createLeadSchema, updateLeadSchema, addLeadNoteSchema } from "../validators/crmValidators";

const router = express.Router();

router.use(protect, authorize("ca_firm_admin", "ca_firm_staff"));

router.get("/dashboard", requireModulePermission("crm"), getCrmDashboard);
router.get("/leads", requireModulePermission("crm"), listLeads);
router.post("/leads", requireModulePermission("crm", "add"), requireActiveFirm, validate(createLeadSchema), createLead);
router.get("/leads/:id", requireModulePermission("crm"), getLead);
router.put("/leads/:id", requireModulePermission("crm", "edit"), requireActiveFirm, validate(updateLeadSchema), updateLead);
router.delete("/leads/:id", requireModulePermission("crm", "delete"), requireActiveFirm, deleteLead);
router.post(
  "/leads/:id/notes",
  requireModulePermission("crm"),
  requireActiveFirm,
  validate(addLeadNoteSchema),
  addLeadNote
);

export default router;
