"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const activityLogController_1 = require("../controllers/activityLogController");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const constants_1 = require("../constants");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Get all activity logs (SuperAdmin only)
router.get("/", (0, role_1.checkRole)(constants_1.ROLES.SuperAdmin), activityLogController_1.getActivityLogs);
// Get activity log by ID (SuperAdmin only)
router.get("/:id", (0, role_1.checkRole)(constants_1.ROLES.SuperAdmin), activityLogController_1.getActivityLogById);
// Get activity logs for a specific user (SuperAdmin only)
router.get("/user/:userId", (0, role_1.checkRole)(constants_1.ROLES.SuperAdmin), activityLogController_1.getUserActivityLogs);
// Get activity statistics (SuperAdmin only)
router.get("/stats/overview", (0, role_1.checkRole)(constants_1.ROLES.SuperAdmin), activityLogController_1.getActivityStatistics);
// Get activity summary for dashboard (SuperAdmin only)
router.get("/stats/summary", (0, role_1.checkRole)(constants_1.ROLES.SuperAdmin), activityLogController_1.getActivitySummary);
// Export activity logs to CSV (SuperAdmin only)
router.get("/export/csv", (0, role_1.checkRole)(constants_1.ROLES.SuperAdmin), activityLogController_1.exportActivityLogs);
// Cleanup old activity logs (SuperAdmin only)
router.delete("/cleanup", (0, role_1.checkRole)(constants_1.ROLES.SuperAdmin), activityLogController_1.cleanupOldLogs);
// Clear all activity logs (SuperAdmin only)
router.delete("/clear-all", (0, role_1.checkRole)(constants_1.ROLES.SuperAdmin), activityLogController_1.deleteAllLogs);
exports.default = router;
