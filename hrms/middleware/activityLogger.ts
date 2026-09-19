import { Request, Response, NextFunction } from "express";
import ActivityLog from "../models/ActivityLog";
import { ROLES } from "../constants";

// Extend Request interface to include user
interface AuthRequest extends Request {
  user?: any;
}

// Helper function to get client IP address
const getClientIP = (req: Request): string => {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    (req.headers["x-real-ip"] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection as any)?.socket?.remoteAddress ||
    "unknown"
  );
};

// Helper function to determine business action from route and method
const getBusinessAction = (req: Request, method: string, route: string, originalUrl: string): { action: string; resourceType: string } => {
  // Use originalUrl to get the full path including /api/schools/...
  const fullPath = originalUrl || route;
  const routeLower = fullPath.toLowerCase();

  // School management
  if (routeLower.includes("/schools")) {
    if (method === "POST") return { action: "CREATED_SCHOOL", resourceType: "SCHOOL" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_SCHOOL", resourceType: "SCHOOL" };
    if (method === "DELETE") return { action: "DELETED_SCHOOL", resourceType: "SCHOOL" };
  }

  // Student management
  if (routeLower.includes("/students")) {
    if (method === "POST") return { action: "CREATED_STUDENT", resourceType: "STUDENT" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_STUDENT", resourceType: "STUDENT" };
    if (method === "DELETE") return { action: "DELETED_STUDENT", resourceType: "STUDENT" };
    if (routeLower.includes("bulk-upload")) return { action: "BULK_UPLOADED_STUDENTS", resourceType: "STUDENT" };
  }

  // Mentor management
  if (routeLower.includes("/mentors")) {
    if (method === "POST") return { action: "CREATED_MENTOR", resourceType: "MENTOR" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_MENTOR", resourceType: "MENTOR" };
    if (method === "DELETE") return { action: "DELETED_MENTOR", resourceType: "MENTOR" };
  }

  // School admin management
  if (routeLower.includes("/school-admins")) {
    if (method === "POST") return { action: "CREATED_SCHOOL_ADMIN", resourceType: "SCHOOL_ADMIN" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_SCHOOL_ADMIN", resourceType: "SCHOOL_ADMIN" };
    if (method === "DELETE") return { action: "DELETED_SCHOOL_ADMIN", resourceType: "SCHOOL_ADMIN" };
  }

  // Lead mentor management
  if (routeLower.includes("/lead-mentors")) {
    if (method === "POST") return { action: "CREATED_LEAD_MENTOR", resourceType: "LEAD_MENTOR" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_LEAD_MENTOR", resourceType: "LEAD_MENTOR" };
    if (method === "DELETE") return { action: "DELETED_LEAD_MENTOR", resourceType: "LEAD_MENTOR" };
  }

  // Super admin management
  if (routeLower.includes("/superadmins") || routeLower.includes("/admins")) {
    if (method === "POST") return { action: "CREATED_SUPER_ADMIN", resourceType: "SUPER_ADMIN" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_SUPER_ADMIN", resourceType: "SUPER_ADMIN" };
    if (method === "DELETE") return { action: "DELETED_SUPER_ADMIN", resourceType: "SUPER_ADMIN" };
  }

  // Module management
  if (routeLower.includes("/modules")) {
    if (method === "POST") return { action: "CREATED_MODULE", resourceType: "MODULE" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_MODULE", resourceType: "MODULE" };
    if (method === "DELETE") return { action: "DELETED_MODULE", resourceType: "MODULE" };
  }

  // Session management
  if (routeLower.includes("/sessions")) {
    if (method === "POST") return { action: "CREATED_SESSION", resourceType: "SESSION" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_SESSION", resourceType: "SESSION" };
    if (method === "DELETE") return { action: "DELETED_SESSION", resourceType: "SESSION" };
  }

  // Resource management
  if (routeLower.includes("/resources")) {
    if (method === "POST") return { action: "UPLOADED_RESOURCE", resourceType: "RESOURCE" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_RESOURCE", resourceType: "RESOURCE" };
    if (method === "DELETE") return { action: "DELETED_RESOURCE", resourceType: "RESOURCE" };
  }

  // Assessment management
  if (routeLower.includes("/assessments")) {
    if (method === "POST") return { action: "CREATED_ASSESSMENT", resourceType: "ASSESSMENT" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_ASSESSMENT", resourceType: "ASSESSMENT" };
    if (method === "DELETE") return { action: "DELETED_ASSESSMENT", resourceType: "ASSESSMENT" };
  }

  // Question bank
  if (routeLower.includes("/questions")) {
    if (method === "POST") return { action: "CREATED_QUESTION", resourceType: "QUESTION" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_QUESTION", resourceType: "QUESTION" };
    if (method === "DELETE") return { action: "DELETED_QUESTION", resourceType: "QUESTION" };
  }

  // Certificate management
  if (routeLower.includes("/certificates")) {
    if (method === "POST") return { action: "GENERATED_CERTIFICATE", resourceType: "CERTIFICATE" };
    if (method === "DELETE") return { action: "DELETED_CERTIFICATE", resourceType: "CERTIFICATE" };
  }

  // HRMS - Salary Structure
  if (routeLower.includes("/salary-structures")) {
    if (method === "POST") return { action: "CREATED_SALARY_STRUCTURE", resourceType: "SALARY_STRUCTURE" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_SALARY_STRUCTURE", resourceType: "SALARY_STRUCTURE" };
    if (method === "DELETE") return { action: "DELETED_SALARY_STRUCTURE", resourceType: "SALARY_STRUCTURE" };
  }

  // HRMS - Statutory Reports
  if (routeLower.includes("/statutory-reports")) {
    if (method === "POST" && routeLower.includes("/generate")) return { action: "GENERATED_STATUTORY_REPORT", resourceType: "STATUTORY_REPORT" };
  }

  // HRMS - Employees (Users in HRMS context)
  if (routeLower.includes("/users")) {
    if (method === "POST") return { action: "CREATED_EMPLOYEE", resourceType: "EMPLOYEE" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_EMPLOYEE", resourceType: "EMPLOYEE" };
    if (method === "DELETE") return { action: "DELETED_EMPLOYEE", resourceType: "EMPLOYEE" };
  }

  // HRMS - Attendance
  if (routeLower.includes("/attendance")) {
    if (method === "POST") return { action: "CREATED_ATTENDANCE", resourceType: "ATTENDANCE" };
    if (method === "PUT" || method === "PATCH") return { action: "UPDATED_ATTENDANCE", resourceType: "ATTENDANCE" };
    if (method === "DELETE") return { action: "DELETED_ATTENDANCE", resourceType: "ATTENDANCE" };
  }

  // HRMS - Leaves
  if (routeLower.includes("/employee/leaves")) {
    if (method === "PATCH" || method === "PUT") {
      if (req.body?.status === "Approved") return { action: "APPROVED_LEAVE", resourceType: "LEAVE" };
      if (req.body?.status === "Rejected") return { action: "REJECTED_LEAVE", resourceType: "LEAVE" };
    }
  }

  // HRMS - System Config & All Modules (Comprehensive Mapping)
  const configMap: { [key: string]: string } = {
    "/designations": "DESIGNATION",
    "/departments": "DEPARTMENT",
    "/branches": "BRANCH",
    "/companies": "COMPANY",
    "/cost-centers": "COST_CENTER",
    "/working-days": "WORKING_DAY",
    "/policies": "POLICY",
    "/job-openings": "JOB_OPENING",
    "/candidates": "CANDIDATE",
    "/role": "ROLE",
    "/holidays": "HOLIDAY",
    "/shifts": "SHIFT",
    "/goals": "GOAL",
    "/appraisals": "APPRAISAL",
    "/self-appraisals": "APPRAISAL",
    "/feedback": "FEEDBACK",
    "/expenses": "EXPENSE",
    "/travel-requests": "TRAVEL_REQUEST",
    "/asset": "ASSET",
    "/non-it-assets": "ASSET",
    "/license": "SOFTWARE_LICENSE",
    "/workstations": "WORKSTATION",
    "/access-cards": "ACCESS_CARD",
    "/locker-assignments": "LOCKER",
    "/parking-assignments": "PARKING",
    "/overtime": "OVERTIME",
    "/resignation": "RESIGNATION",
    "/clearances": "CLEARANCE",
    "/final-settlement": "FINAL_SETTLEMENT",
    "/leave-types": "LEAVE_TYPE",
    "/onboarding-tasks": "ONBOARDING_TASK"
  };

  for (const [path, type] of Object.entries(configMap)) {
    if (routeLower.includes(path)) {
      if (method === "POST") return { action: `CREATED_${type}`, resourceType: type };
      if (method === "PUT" || method === "PATCH") return { action: `UPDATED_${type}`, resourceType: type };
      if (method === "DELETE") return { action: `DELETED_${type}`, resourceType: type };
    }
  }


  // Don't log other operations
  return { action: "SKIP", resourceType: "OTHER" };
};

// Helper function to generate business-focused descriptions
const generateBusinessDescription = (
  action: string,
  resourceName: string | null,
  userName: string
): string => {
  const actionMap: { [key: string]: string } = {
    "CREATED_SCHOOL": "Created school",
    "UPDATED_SCHOOL": "Updated school",
    "DELETED_SCHOOL": "Deleted school",
    "CREATED_STUDENT": "Created student",
    "UPDATED_STUDENT": "Updated student",
    "DELETED_STUDENT": "Deleted student",
    "BULK_UPLOADED_STUDENTS": "Bulk uploaded students",
    "CREATED_MENTOR": "Created mentor",
    "UPDATED_MENTOR": "Updated mentor",
    "DELETED_MENTOR": "Deleted mentor",
    "CREATED_SCHOOL_ADMIN": "Created school admin",
    "UPDATED_SCHOOL_ADMIN": "Updated school admin",
    "DELETED_SCHOOL_ADMIN": "Deleted school admin",
    "CREATED_LEAD_MENTOR": "Created lead mentor",
    "UPDATED_LEAD_MENTOR": "Updated lead mentor",
    "DELETED_LEAD_MENTOR": "Deleted lead mentor",
    "CREATED_SUPER_ADMIN": "Created super admin",
    "UPDATED_SUPER_ADMIN": "Updated super admin",
    "DELETED_SUPER_ADMIN": "Deleted super admin",
    "CREATED_MODULE": "Created module",
    "UPDATED_MODULE": "Updated module",
    "DELETED_MODULE": "Deleted module",
    "CREATED_SESSION": "Created session",
    "UPDATED_SESSION": "Updated session",
    "DELETED_SESSION": "Deleted session",
    "UPLOADED_RESOURCE": "Uploaded resource",
    "UPDATED_RESOURCE": "Updated resource",
    "DELETED_RESOURCE": "Deleted resource",
    "CREATED_ASSESSMENT": "Created assessment",
    "UPDATED_ASSESSMENT": "Updated assessment",
    "DELETED_ASSESSMENT": "Deleted assessment",
    "CREATED_QUESTION": "Created question",
    "UPDATED_QUESTION": "Updated question",
    "DELETED_QUESTION": "Deleted question",
    "GENERATED_CERTIFICATE": "Generated certificate",
    "DELETED_CERTIFICATE": "Deleted certificate"
  };

  const actionText = actionMap[action] || action.replace(/_/g, " ").toLowerCase();

  if (resourceName) {
    return `${actionText} "${resourceName}"`;
  } else {
    return actionText;
  }
};

// Helper function to determine resource type from route
const getResourceTypeFromRoute = (route: string): string => {
  const routeLower = route.toLowerCase();

  if (routeLower.includes("/users")) return "USER";
  if (routeLower.includes("/students")) return "STUDENT";
  if (routeLower.includes("/mentors")) return "MENTOR";
  if (routeLower.includes("/school-admins")) return "SCHOOL_ADMIN";
  if (routeLower.includes("/lead-mentors")) return "LEAD_MENTOR";
  if (routeLower.includes("/super-admins")) return "SUPER_ADMIN";
  if (routeLower.includes("/schools")) return "SCHOOL";
  if (routeLower.includes("/modules")) return "MODULE";
  if (routeLower.includes("/sessions")) return "SESSION";
  if (routeLower.includes("/resources")) return "RESOURCE";
  if (routeLower.includes("/assessments")) return "ASSESSMENT";
  if (routeLower.includes("/questions")) return "QUESTION";
  if (routeLower.includes("/certificates")) return "CERTIFICATE";
  if (routeLower.includes("/notifications")) return "NOTIFICATION";
  if (routeLower.includes("/messages")) return "MESSAGE";
  if (routeLower.includes("/files")) return "FILE";
  if (routeLower.includes("/salary-structures")) return "SALARY_STRUCTURE";
  if (routeLower.includes("/statutory-reports")) return "STATUTORY_REPORT";
  if (routeLower.includes("/attendance")) return "ATTENDANCE";
  if (routeLower.includes("/employee/leaves")) return "LEAVE";
  if (routeLower.includes("/designations")) return "DESIGNATION";
  if (routeLower.includes("/departments")) return "DEPARTMENT";
  if (routeLower.includes("/branches")) return "BRANCH";
  if (routeLower.includes("/companies")) return "COMPANY";
  if (routeLower.includes("/cost-centers")) return "COST_CENTER";
  if (routeLower.includes("/working-days")) return "WORKING_DAY";
  if (routeLower.includes("/policies")) return "POLICY";
  if (routeLower.includes("/job-openings")) return "JOB_OPENING";
  if (routeLower.includes("/candidates")) return "CANDIDATE";

  return "OTHER";
};

// Helper function to determine severity based on action and status code
const getSeverity = (action: string, statusCode: number): string => {
  // Critical actions
  if (["DELETE_USER", "DELETE_SCHOOL", "DELETE_STUDENT", "DELETE_MENTOR"].includes(action)) {
    return statusCode >= 400 ? "CRITICAL" : "HIGH";
  }

  // High severity actions
  if (["CREATE_USER", "UPDATE_USER", "CREATE_SCHOOL", "BULK_UPLOAD_STUDENTS"].includes(action)) {
    return statusCode >= 400 ? "HIGH" : "MEDIUM";
  }

  // Medium severity actions
  if (["LOGIN", "LOGOUT", "PASSWORD_RESET", "UPLOAD_RESOURCE", "CREATE_ASSESSMENT"].includes(action)) {
    return statusCode >= 400 ? "MEDIUM" : "LOW";
  }

  // Low severity actions
  if (["VIEW_DASHBOARD", "VIEW_RESOURCE", "VIEW_MESSAGE"].includes(action)) {
    return "LOW";
  }

  // Default based on status code
  if (statusCode >= 500) return "HIGH";
  if (statusCode >= 400) return "MEDIUM";
  return "LOW";
};

// Main activity logging middleware
export const activityLogger = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Guard against double execution in the same request
  if ((req as any)._activityLogApplied) {
    return next();
  }
  (req as any)._activityLogApplied = true;

  const startTime = Date.now();

  // Skip logging for certain routes
  const skipRoutes = [
    "/health",
    "/ping",
    "/favicon.ico",
    "/activity-logs", // Prevent infinite loops
  ];

  if (skipRoutes.some(route => req.path.includes(route))) {
    return next();
  }

  // Skip if no user (unauthenticated requests)
  if (!req.user) {
    return next();
  }

  // Only log CUD operations (Create, Update, Delete) - no GET requests
  const shouldLog = req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE";

  if (!shouldLog) {
    return next();
  }

  // Skip certain routes that shouldn't be logged
  const skipLoggingRoutes = [
    "/auth/login",
    "/auth/logout",
    "/auth/register",
    "/notifications",
    "/messages",
    "/session-progress",
    "/module-completion"
  ];

  if (skipLoggingRoutes.some(route => req.path.includes(route))) {
    return next();
  }

  // Store original res.json to capture response
  const originalJson = res.json;
  let responseBody: any = null;
  let statusCode = 200;

  res.json = function (body: any) {
    responseBody = body;
    statusCode = res.statusCode;
    return originalJson.call(this, body);
  };

  // Override res.end to capture status code
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    statusCode = res.statusCode;
    return originalEnd.call(this, chunk, encoding);
  };

  // Continue with the request
  next();

  // Log the activity after response
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const businessAction = getBusinessAction(req, req.method, req.path, req.originalUrl);

      // Skip if not a business operation we want to log
      if (businessAction.action === "SKIP") {
        return;
      }

      const severity = getSeverity(businessAction.action, statusCode);

      // Extract resource ID from URL params if available
      let resourceId = null;
      const idMatch = req.path.match(/\/([a-f0-9]{24})\b/);
      if (idMatch) {
        resourceId = idMatch[1];
      }

      // Create activity log entry
      const resourceName = req.body?.name || req.body?.title || req.body?.email || null;
      const description = generateBusinessDescription(
        businessAction.action,
        resourceName,
        req.user.name || "Unknown User"
      );

      const activityLog = new ActivityLog({
        userId: req.user._id,
        userEmail: req.user.email,
        userName: req.user.name || "Unknown User",
        userRole: req.user.role,
        action: businessAction.action,
        resourceType: businessAction.resourceType,
        resourceId,
        resourceName,
        ipAddress: getClientIP(req),
        userAgent: req.headers["user-agent"] || "unknown",
        endpoint: req.path,
        method: req.method,
        statusCode,
        description,
        details: {
          requestBody: req.method !== "GET" ? req.body : null,
          queryParams: req.query,
          responseBody: statusCode >= 400 ? responseBody : null,
        },
        schoolId: req.user.schoolId || null,
        schoolName: req.user.schoolName || null,
        severity,
        isSuccess: statusCode < 400,
        errorMessage: statusCode >= 400 ? responseBody?.message || "Unknown error" : null,
        duration,
        metadata: {
          originalUrl: req.originalUrl,
          referer: req.headers.referer || null,
          contentType: req.headers["content-type"] || null,
        },
      });

      await activityLog.save();

    } catch (error) {
      console.error("Error logging activity:", error);
      // Don't throw error to avoid breaking the main request
    }
  });
};

// Helper function to manually log activities
export const logActivity = async (
  userId: string,
  userEmail: string,
  userName: string,
  userRole: string,
  action: string,
  resourceType: string,
  description: string,
  details: any = {},
  options: {
    resourceId?: string;
    resourceName?: string;
    schoolId?: string;
    schoolName?: string;
    severity?: string;
    isSuccess?: boolean;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
  } = {}
) => {
  try {
    const activityLog = new ActivityLog({
      userId,
      userEmail,
      userName,
      userRole,
      action,
      resourceType,
      resourceId: options.resourceId || null,
      resourceName: options.resourceName || null,
      ipAddress: options.ipAddress || "system",
      userAgent: options.userAgent || "system",
      endpoint: "manual",
      method: "POST",
      statusCode: options.isSuccess ? 200 : 500,
      description,
      details,
      schoolId: options.schoolId || null,
      schoolName: options.schoolName || null,
      severity: options.severity || "LOW",
      isSuccess: options.isSuccess !== false,
      errorMessage: options.errorMessage || null,
      metadata: {},
    });

    await activityLog.save();
  } catch (error) {
    console.error("Error manually logging activity:", error);
  }
};
