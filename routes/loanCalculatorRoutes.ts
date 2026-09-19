import express from "express";
import { listCalculations, createCalculation, deleteCalculation } from "../controllers/loanCalculatorController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { validate } from "../middleware/validateRequest";
import { requireActiveFirm } from "../middleware/requireActiveFirm";
import { createCalculationSchema } from "../validators/loanCalculatorValidators";

const router = express.Router();

router.use(protect, authorize("ca_firm_admin", "ca_firm_staff"));

router.get("/calculations", listCalculations);
router.post("/calculations", requireActiveFirm, validate(createCalculationSchema), createCalculation);
router.delete("/calculations/:id", requireActiveFirm, deleteCalculation);

export default router;
