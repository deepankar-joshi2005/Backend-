import express from "express";
import { listProfiles, getProfile, createProfile, updateProfile, deleteProfile, computeProjection } from "../controllers/financeTrackerController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { requireModulePermission } from "../middleware/requireModulePermission";
import { validate } from "../middleware/validateRequest";
import { requireActiveFirm } from "../middleware/requireActiveFirm";
import { createFinanceProfileSchema, updateFinanceProfileSchema, projectionSchema } from "../validators/financeTrackerValidators";

const router = express.Router();

router.use(protect, authorize("ca_firm_admin", "ca_firm_staff"));

router.get("/profiles", requireModulePermission("financeTracker"), listProfiles);
router.get("/profiles/:id", requireModulePermission("financeTracker"), getProfile);
router.post("/profiles", requireModulePermission("financeTracker", "add"), requireActiveFirm, validate(createFinanceProfileSchema), createProfile);
router.put("/profiles/:id", requireModulePermission("financeTracker", "edit"), requireActiveFirm, validate(updateFinanceProfileSchema), updateProfile);
router.delete("/profiles/:id", requireModulePermission("financeTracker", "delete"), requireActiveFirm, deleteProfile);
router.post(
  "/profiles/:id/projection",
  requireModulePermission("financeTracker"),
  requireActiveFirm,
  validate(projectionSchema),
  computeProjection
);

export default router;
