"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllLogs = exports.getActivitySummary = exports.cleanupOldLogs = exports.exportActivityLogs = exports.getActivityStatistics = exports.getUserActivityLogs = exports.getActivityLogById = exports.getActivityLogs = void 0;
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const User_1 = __importDefault(require("../models/User"));
const constants_1 = require("../constants");
// Get all activity logs with filtering and pagination
const getActivityLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, userId, action, resourceType, severity, isSuccess, startDate, endDate, search, sortBy = "createdAt", sortOrder = "desc" } = req.query;
        // Build filter object
        const filter = {};
        if (userId)
            filter.userId = userId;
        if (action)
            filter.action = action;
        if (resourceType)
            filter.resourceType = resourceType;
        if (severity)
            filter.severity = severity;
        if (isSuccess !== undefined)
            filter.isSuccess = isSuccess === "true";
        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate)
                filter.createdAt.$lte = new Date(endDate);
        }
        // Text search
        if (search) {
            filter.$or = [
                { description: { $regex: search, $options: "i" } },
                { userName: { $regex: search, $options: "i" } },
                { userEmail: { $regex: search, $options: "i" } },
                { resourceName: { $regex: search, $options: "i" } }
            ];
        }
        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit);
        const sort = {};
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;
        // Get total count for pagination
        const total = await ActivityLog_1.default.countDocuments(filter);
        // Get activity logs with pagination
        const activityLogs = await ActivityLog_1.default.find(filter)
            .populate("userId", "name email role")
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        // Get unique values for filter options
        const [actions, resourceTypes, severities, users] = await Promise.all([
            ActivityLog_1.default.distinct("action"),
            ActivityLog_1.default.distinct("resourceType"),
            ActivityLog_1.default.distinct("severity"),
            User_1.default.find({}, "name email role").lean()
        ]);
        // Categorize users by roles
        const categorizedUsers = {
            [constants_1.ROLES.SuperAdmin]: users.filter(user => user.role === constants_1.ROLES.SuperAdmin),
        };
        res.status(200).json({
            success: true,
            data: {
                activityLogs,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / Number(limit)),
                    totalItems: total,
                    itemsPerPage: Number(limit)
                },
                filters: {
                    actions,
                    resourceTypes,
                    severities,
                    users,
                    categorizedUsers
                }
            }
        });
    }
    catch (error) {
        console.error("Error fetching activity logs:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
exports.getActivityLogs = getActivityLogs;
// Get activity log by ID
const getActivityLogById = async (req, res) => {
    try {
        const { id } = req.params;
        const activityLog = await ActivityLog_1.default.findById(id)
            .populate("userId", "name email role")
            .populate("schoolId", "name")
            .lean();
        if (!activityLog) {
            return res.status(404).json({
                success: false,
                message: "Activity log not found"
            });
        }
        res.status(200).json({
            success: true,
            data: activityLog
        });
    }
    catch (error) {
        console.error("Error fetching activity log:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
exports.getActivityLogById = getActivityLogById;
// Get activity logs for a specific user
const getUserActivityLogs = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50, action, resourceType, severity, isSuccess, startDate, endDate } = req.query;
        // Build filter object
        const filter = { userId };
        if (action)
            filter.action = action;
        if (resourceType)
            filter.resourceType = resourceType;
        if (severity)
            filter.severity = severity;
        if (isSuccess !== undefined)
            filter.isSuccess = isSuccess === "true";
        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate)
                filter.createdAt.$lte = new Date(endDate);
        }
        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit);
        // Get total count for pagination
        const total = await ActivityLog_1.default.countDocuments(filter);
        // Get activity logs with pagination
        const activityLogs = await ActivityLog_1.default.find(filter)
            .populate("userId", "name email role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        res.status(200).json({
            success: true,
            data: {
                activityLogs,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / Number(limit)),
                    totalItems: total,
                    itemsPerPage: Number(limit)
                }
            }
        });
    }
    catch (error) {
        console.error("Error fetching user activity logs:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
exports.getUserActivityLogs = getUserActivityLogs;
// Get activity statistics
const getActivityStatistics = async (req, res) => {
    try {
        const { startDate, endDate, schoolId } = req.query;
        // Build filter object
        const filter = {};
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate)
                filter.createdAt.$lte = new Date(endDate);
        }
        // Get various statistics
        const [totalActivities, successfulActivities, failedActivities, activitiesByAction, activitiesByUser, activitiesByResourceType, activitiesBySeverity, activitiesByDay, topUsers, recentActivities] = await Promise.all([
            // Total activities
            ActivityLog_1.default.countDocuments(filter),
            // Successful activities
            ActivityLog_1.default.countDocuments({ ...filter, isSuccess: true }),
            // Failed activities
            ActivityLog_1.default.countDocuments({ ...filter, isSuccess: false }),
            // Activities by action
            ActivityLog_1.default.aggregate([
                { $match: filter },
                { $group: { _id: "$action", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            // Activities by user
            ActivityLog_1.default.aggregate([
                { $match: filter },
                { $group: { _id: "$userId", userName: { $first: "$userName" }, userEmail: { $first: "$userEmail" }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            // Activities by resource type
            ActivityLog_1.default.aggregate([
                { $match: filter },
                { $group: { _id: "$resourceType", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            // Activities by severity
            ActivityLog_1.default.aggregate([
                { $match: filter },
                { $group: { _id: "$severity", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            // Activities by day (last 30 days)
            ActivityLog_1.default.aggregate([
                {
                    $match: {
                        ...filter,
                        createdAt: {
                            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt"
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Top users by activity
            ActivityLog_1.default.aggregate([
                { $match: filter },
                { $group: { _id: "$userId", userName: { $first: "$userName" }, userEmail: { $first: "$userEmail" }, userRole: { $first: "$userRole" }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),
            // Recent activities
            ActivityLog_1.default.find(filter)
                .populate("userId", "name email role")
                .sort({ createdAt: -1 })
                .limit(10)
                .lean()
        ]);
        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalActivities,
                    successfulActivities,
                    failedActivities,
                    successRate: totalActivities > 0 ? (successfulActivities / totalActivities * 100).toFixed(2) : 0
                },
                activitiesByAction,
                activitiesByUser,
                activitiesByResourceType,
                activitiesBySeverity,
                activitiesByDay,
                topUsers,
                recentActivities
            }
        });
    }
    catch (error) {
        console.error("Error fetching activity statistics:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
exports.getActivityStatistics = getActivityStatistics;
// Export activity logs to CSV
const exportActivityLogs = async (req, res) => {
    try {
        const { userId, action, resourceType, schoolId, severity, isSuccess, startDate, endDate, search } = req.query;
        // Build filter object (same as getActivityLogs)
        const filter = {};
        if (userId)
            filter.userId = userId;
        if (action)
            filter.action = action;
        if (resourceType)
            filter.resourceType = resourceType;
        if (schoolId)
            filter.schoolId = schoolId;
        if (severity)
            filter.severity = severity;
        if (isSuccess !== undefined)
            filter.isSuccess = isSuccess === "true";
        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate)
                filter.createdAt.$lte = new Date(endDate);
        }
        // Text search
        if (search) {
            filter.$or = [
                { description: { $regex: search, $options: "i" } },
                { userName: { $regex: search, $options: "i" } },
                { userEmail: { $regex: search, $options: "i" } },
                { resourceName: { $regex: search, $options: "i" } },
                { schoolName: { $regex: search, $options: "i" } }
            ];
        }
        // Get all matching activity logs (no pagination for export)
        const activityLogs = await ActivityLog_1.default.find(filter)
            .populate("userId", "name email role")
            .sort({ createdAt: -1 })
            .lean();
        // Convert to CSV format
        const csvHeaders = [
            "Timestamp",
            "User Name",
            "User Email",
            "User Role",
            "Action",
            "Resource Type",
            "Resource Name",
            "School Name",
            "IP Address",
            "Status",
            "Severity",
            "Description",
            "Duration (ms)"
        ];
        const csvRows = activityLogs.map(log => [
            new Date(log.createdAt).toISOString(),
            log.userName,
            log.userEmail,
            log.userRole,
            log.action,
            log.resourceType,
            log.resourceName || "",
            log.schoolName || "",
            log.ipAddress,
            log.isSuccess ? "Success" : "Failed",
            log.severity,
            log.description,
            log.duration || ""
        ]);
        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(","))
            .join("\n");
        // Set response headers for CSV download
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="activity-logs-${new Date().toISOString().split('T')[0]}.csv"`);
        res.status(200).send(csvContent);
    }
    catch (error) {
        console.error("Error exporting activity logs:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
exports.exportActivityLogs = exportActivityLogs;
// Delete old activity logs (cleanup)
const cleanupOldLogs = async (req, res) => {
    try {
        const { daysToKeep = 90 } = req.body;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await ActivityLog_1.default.deleteMany({
            createdAt: { $lt: cutoffDate }
        });
        res.status(200).json({
            success: true,
            message: `Deleted ${result.deletedCount} old activity logs`,
            deletedCount: result.deletedCount
        });
    }
    catch (error) {
        console.error("Error cleaning up old logs:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
exports.cleanupOldLogs = cleanupOldLogs;
// Get activity log summary for dashboard
const getActivitySummary = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));
        const [totalActivities, uniqueUsers, topActions, recentActivities, errorCount] = await Promise.all([
            ActivityLog_1.default.countDocuments({ createdAt: { $gte: startDate } }),
            ActivityLog_1.default.distinct("userId", { createdAt: { $gte: startDate } }),
            ActivityLog_1.default.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $group: { _id: "$action", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),
            ActivityLog_1.default.find({ createdAt: { $gte: startDate } })
                .populate("userId", "name email role")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            ActivityLog_1.default.countDocuments({
                createdAt: { $gte: startDate },
                isSuccess: false
            })
        ]);
        res.status(200).json({
            success: true,
            data: {
                totalActivities,
                uniqueUsers: uniqueUsers.length,
                topActions,
                recentActivities,
                errorCount,
                period: `${days} days`
            }
        });
    }
    catch (error) {
        console.error("Error fetching activity summary:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
exports.getActivitySummary = getActivitySummary;
// Delete all activity logs (SuperAdmin only)
const deleteAllLogs = async (req, res) => {
    try {
        const result = await ActivityLog_1.default.deleteMany({});
        res.status(200).json({
            success: true,
            message: `Successfully cleared all ${result.deletedCount} activity logs`,
            deletedCount: result.deletedCount
        });
    }
    catch (error) {
        console.error("Error clearing all logs:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
exports.deleteAllLogs = deleteAllLogs;
