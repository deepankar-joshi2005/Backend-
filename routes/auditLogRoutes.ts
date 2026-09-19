import express from "express";
import { listAuditLogs } from "../controllers/auditLogController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";

const router = express.Router();

router.use(protect, authorize("super_admin"));
router.get("/", listAuditLogs);

export default router;
