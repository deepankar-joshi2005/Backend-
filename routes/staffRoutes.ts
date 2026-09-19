import express from "express";
import { listStaff, createStaff, updateStaff, resetStaffPassword } from "../controllers/staffController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { validate } from "../middleware/validateRequest";
import { requireActiveFirm } from "../middleware/requireActiveFirm";
import { createStaffSchema, updateStaffSchema, resetStaffPasswordSchema } from "../validators/staffValidators";

const router = express.Router();

router.use(protect, authorize("ca_firm_admin"));

router.get("/", listStaff);
router.post("/", requireActiveFirm, validate(createStaffSchema), createStaff);
router.put("/:id", requireActiveFirm, validate(updateStaffSchema), updateStaff);
router.put("/:id/reset-password", requireActiveFirm, validate(resetStaffPasswordSchema), resetStaffPassword);

export default router;
