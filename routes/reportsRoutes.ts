import express from "express";
import {
  getReportsOverview,
  getCaFirmsReport,
  getBusinessClientsReport,
  getSubscriptionsReport,
} from "../controllers/reportsController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";

const router = express.Router();

router.use(protect, authorize("super_admin"));

router.get("/overview", getReportsOverview);
router.get("/ca-firms", getCaFirmsReport);
router.get("/business-clients", getBusinessClientsReport);
router.get("/subscriptions", getSubscriptionsReport);

export default router;
