import express from "express";
import { listPlanTiers, updatePlanTier } from "../controllers/hrmsPlanTierController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";

const router = express.Router();

router.use(protect);
router.get("/", listPlanTiers);
router.put("/:id", authorize("super_admin"), updatePlanTier);

export default router;
