import { Request, Response } from "express";
import ActivityLog from "../models/ActivityLog";
import User from "../models/User";
import { ROLES } from "../constants";
import { AuthRequest } from "../middleware/auth";

// Get all activity logs with filtering and pagination
export const getActivityLogs = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      resourceType,
      severity,
      isSuccess,
      startDate,
      endDate,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build filter object
    const filter: any = {};

    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (severity) filter.severity = severity;
    if (isSuccess !== undefined) filter.isSuccess = isSuccess === "true";

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
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
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

    // Get total count for pagination
    const total = await ActivityLog.countDocuments(filter);

    // Get activity logs with pagination
    const activityLogs = await ActivityLog.find(filter)
      .populate("userId", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Get unique values for filter options
    const [actions, resourceTypes, severities, users] = await Promise.all([
      ActivityLog.distinct("action"),
      ActivityLog.distinct("resourceType"),
      ActivityLog.distinct("severity"),
      User.find({}, "name email role").lean()
    ]);

    // Categorize users by roles
    const categorizedUsers = {
      [ROLES.SuperAdmin]: users.filter(user => user.role === ROLES.SuperAdmin),
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
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get activity log by ID
export const getActivityLogById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const activityLog = await ActivityLog.findById(id)
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
  } catch (error) {
    console.error("Error fetching activity log:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get activity logs for a specific user
export const getUserActivityLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 50,
      action,
      resourceType,
      severity,
      isSuccess,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter: any = { userId };

    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (severity) filter.severity = severity;
    if (isSuccess !== undefined) filter.isSuccess = isSuccess === "true";

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get total count for pagination
    const total = await ActivityLog.countDocuments(filter);

    // Get activity logs with pagination
    const activityLogs = await ActivityLog.find(filter)
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
  } catch (error) {
    console.error("Error fetching user activity logs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get activity statistics
export const getActivityStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, schoolId } = req.query;

    // Build filter object
    const filter: any = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    // Get various statistics
    const [
      totalActivities,
      successfulActivities,
      failedActivities,
      activitiesByAction,
      activitiesByUser,
      activitiesByResourceType,
      activitiesBySeverity,
      activitiesByDay,
      topUsers,
      recentActivities
    ] = await Promise.all([
      // Total activities
      ActivityLog.countDocuments(filter),

      // Successful activities
      ActivityLog.countDocuments({ ...filter, isSuccess: true }),

      // Failed activities
      ActivityLog.countDocuments({ ...filter, isSuccess: false }),

      // Activities by action
      ActivityLog.aggregate([
        { $match: filter },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Activities by user
      ActivityLog.aggregate([
        { $match: filter },
        { $group: { _id: "$userId", userName: { $first: "$userName" }, userEmail: { $first: "$userEmail" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Activities by resource type
      ActivityLog.aggregate([
        { $match: filter },
        { $group: { _id: "$resourceType", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Activities by severity
      ActivityLog.aggregate([
        { $match: filter },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Activities by day (last 30 days)
      ActivityLog.aggregate([
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
      ActivityLog.aggregate([
        { $match: filter },
        { $group: { _id: "$userId", userName: { $first: "$userName" }, userEmail: { $first: "$userEmail" }, userRole: { $first: "$userRole" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // Recent activities
      ActivityLog.find(filter)
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
  } catch (error) {
    console.error("Error fetching activity statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Export activity logs to CSV
export const exportActivityLogs = async (req: AuthRequest, res: Response) => {
  try {
    const {
      userId,
      action,
      resourceType,
      schoolId,
      severity,
      isSuccess,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object (same as getActivityLogs)
    const filter: any = {};

    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (schoolId) filter.schoolId = schoolId;
    if (severity) filter.severity = severity;
    if (isSuccess !== undefined) filter.isSuccess = isSuccess === "true";

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
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
    const activityLogs = await ActivityLog.find(filter)
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
  } catch (error) {
    console.error("Error exporting activity logs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Delete old activity logs (cleanup)
export const cleanupOldLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await ActivityLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old activity logs`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error cleaning up old logs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get activity log summary for dashboard
export const getActivitySummary = async (req: AuthRequest, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const [
      totalActivities,
      uniqueUsers,
      topActions,
      recentActivities,
      errorCount
    ] = await Promise.all([
      ActivityLog.countDocuments({ createdAt: { $gte: startDate } }),
      ActivityLog.distinct("userId", { createdAt: { $gte: startDate } }),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      ActivityLog.find({ createdAt: { $gte: startDate } })
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      ActivityLog.countDocuments({
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
  } catch (error) {
    console.error("Error fetching activity summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Delete all activity logs (SuperAdmin only)
export const deleteAllLogs = async (req: AuthRequest, res: Response) => {
  try {
    const result = await ActivityLog.deleteMany({});

    res.status(200).json({
      success: true,
      message: `Successfully cleared all ${result.deletedCount} activity logs`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error clearing all logs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
