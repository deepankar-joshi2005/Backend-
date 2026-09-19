import express from "express";
import { getBillingSummary, listFirmBilling } from "../controllers/billingController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";

const router = express.Router();

router.use(protect);
router.get("/summary", authorize("super_admin"), getBillingSummary);
router.get("/firms", authorize("super_admin"), listFirmBilling);

export default router;
