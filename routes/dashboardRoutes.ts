import express from "express";
import { getSuperAdminDashboard } from "../controllers/dashboardController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";

const router = express.Router();

router.use(protect);
router.get("/super-admin", authorize("super_admin"), getSuperAdminDashboard);

export default router;
