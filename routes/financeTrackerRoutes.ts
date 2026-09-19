import express from "express";
import { listProfiles, getProfile, createProfile, updateProfile, deleteProfile, computeProjection } from "../controllers/financeTrackerController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { validate } from "../middleware/validateRequest";
import { requireActiveFirm } from "../middleware/requireActiveFirm";
import { createFinanceProfileSchema, updateFinanceProfileSchema, projectionSchema } from "../validators/financeTrackerValidators";

const router = express.Router();

router.use(protect, authorize("ca_firm_admin", "ca_firm_staff"));

router.get("/profiles", listProfiles);
router.get("/profiles/:id", getProfile);
router.post("/profiles", requireActiveFirm, validate(createFinanceProfileSchema), createProfile);
router.put("/profiles/:id", requireActiveFirm, validate(updateFinanceProfileSchema), updateProfile);
router.delete("/profiles/:id", requireActiveFirm, deleteProfile);
router.post("/profiles/:id/projection", requireActiveFirm, validate(projectionSchema), computeProjection);

export default router;
