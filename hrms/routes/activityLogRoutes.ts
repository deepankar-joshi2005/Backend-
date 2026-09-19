import express from "express";
import {
  getActivityLogs,
  getActivityLogById,
  getUserActivityLogs,
  getActivityStatistics,
  exportActivityLogs,
  cleanupOldLogs,
  getActivitySummary,
  deleteAllLogs
} from "../controllers/activityLogController";
import { authMiddleware } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { ROLES } from "../constants";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all activity logs (SuperAdmin only)
router.get("/", checkRole(ROLES.SuperAdmin), getActivityLogs);

// Get activity log by ID (SuperAdmin only)
router.get("/:id", checkRole(ROLES.SuperAdmin), getActivityLogById);

// Get activity logs for a specific user (SuperAdmin only)
router.get("/user/:userId", checkRole(ROLES.SuperAdmin), getUserActivityLogs);

// Get activity statistics (SuperAdmin only)
router.get("/stats/overview", checkRole(ROLES.SuperAdmin), getActivityStatistics);

// Get activity summary for dashboard (SuperAdmin only)
router.get("/stats/summary", checkRole(ROLES.SuperAdmin), getActivitySummary);

// Export activity logs to CSV (SuperAdmin only)
router.get("/export/csv", checkRole(ROLES.SuperAdmin), exportActivityLogs);

// Cleanup old activity logs (SuperAdmin only)
router.delete("/cleanup", checkRole(ROLES.SuperAdmin), cleanupOldLogs);

// Clear all activity logs (SuperAdmin only)
router.delete("/clear-all", checkRole(ROLES.SuperAdmin), deleteAllLogs);

export default router;
