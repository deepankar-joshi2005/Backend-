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
import { validate } from "../middleware/validateRequest";
import { requireActiveFirm } from "../middleware/requireActiveFirm";
import { createLeadSchema, updateLeadSchema, addLeadNoteSchema } from "../validators/crmValidators";

const router = express.Router();

router.use(protect, authorize("ca_firm_admin", "ca_firm_staff"));

router.get("/dashboard", getCrmDashboard);
router.get("/leads", listLeads);
router.post("/leads", requireActiveFirm, validate(createLeadSchema), createLead);
router.get("/leads/:id", getLead);
router.put("/leads/:id", requireActiveFirm, validate(updateLeadSchema), updateLead);
router.delete("/leads/:id", authorize("ca_firm_admin"), requireActiveFirm, deleteLead);
router.post("/leads/:id/notes", requireActiveFirm, validate(addLeadNoteSchema), addLeadNote);

export default router;
