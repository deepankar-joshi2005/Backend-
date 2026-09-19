import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    // User who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },

    // Action details
    action: {
      type: String,
      required: true,
      enum: [
        // Authentication actions
        "LOGIN",
        "LOGOUT",
        "REGISTER",
        "PASSWORD_RESET",
        "ACCOUNT_SETUP",

        // School management actions
        "CREATED_SCHOOL",
        "UPDATED_SCHOOL",
        "DELETED_SCHOOL",

        // Student management actions
        "CREATED_STUDENT",
        "UPDATED_STUDENT",
        "DELETED_STUDENT",
        "BULK_UPLOADED_STUDENTS",

        // Mentor management actions
        "CREATED_MENTOR",
        "UPDATED_MENTOR",
        "DELETED_MENTOR",

        // School admin management actions
        "CREATED_SCHOOL_ADMIN",
        "UPDATED_SCHOOL_ADMIN",
        "DELETED_SCHOOL_ADMIN",
        "ACTIVATED_SCHOOL_ADMIN",
        "DEACTIVATED_SCHOOL_ADMIN",

        // Lead mentor management actions
        "CREATED_LEAD_MENTOR",
        "UPDATED_LEAD_MENTOR",
        "DELETED_LEAD_MENTOR",

        // Super admin management actions
        "CREATED_SUPER_ADMIN",
        "UPDATED_SUPER_ADMIN",
        "DELETED_SUPER_ADMIN",

        // Module management actions
        "CREATED_MODULE",
        "UPDATED_MODULE",
        "DELETED_MODULE",

        // Session management actions
        "CREATED_SESSION",
        "UPDATED_SESSION",
        "DELETED_SESSION",

        // Resource management actions
        "UPLOADED_RESOURCE",
        "UPDATED_RESOURCE",
        "DELETED_RESOURCE",

        // Assessment actions
        "CREATED_ASSESSMENT",
        "UPDATED_ASSESSMENT",
        "DELETED_ASSESSMENT",

        // Question bank actions
        "CREATED_QUESTION",
        "UPDATED_QUESTION",
        "DELETED_QUESTION",

        // Certificate actions
        "GENERATED_CERTIFICATE",
        "DELETED_CERTIFICATE",

        // System actions
        "SYSTEM_BACKUP",
        "SYSTEM_RESTORE",
        "CONFIGURATION_CHANGE",
        "PERMISSION_CHANGE",

        // File operations
        "UPLOADED_FILE",
        "DELETED_FILE",

        // Export/Import actions
        "EXPORTED_DATA",
        "IMPORTED_DATA",

        // HRMS actions
        "CREATED_EMPLOYEE",
        "UPDATED_EMPLOYEE",
        "DELETED_EMPLOYEE",
        "CREATED_SALARY_STRUCTURE",
        "UPDATED_SALARY_STRUCTURE",
        "DELETED_SALARY_STRUCTURE",
        "GENERATED_STATUTORY_REPORT",
        "CREATED_ATTENDANCE",
        "UPDATED_ATTENDANCE",
        "DELETED_ATTENDANCE",
        "APPROVED_LEAVE",
        "REJECTED_LEAVE",
        "CREATED_LEAVE_TYPE",
        "UPDATED_LEAVE_TYPE",
        "DELETED_LEAVE_TYPE",
        "CREATED_DESIGNATION",
        "UPDATED_DESIGNATION",
        "DELETED_DESIGNATION",
        "CREATED_DEPARTMENT",
        "UPDATED_DEPARTMENT",
        "DELETED_DEPARTMENT",
        "CREATED_BRANCH",
        "UPDATED_BRANCH",
        "DELETED_BRANCH",
        "CREATED_COMPANY",
        "UPDATED_COMPANY",
        "DELETED_COMPANY",
        "CREATED_COST_CENTER",
        "UPDATED_COST_CENTER",
        "DELETED_COST_CENTER",
        "CREATED_WORKING_DAY",
        "UPDATED_WORKING_DAY",
        "DELETED_WORKING_DAY",
        "CREATED_POLICY",
        "UPDATED_POLICY",
        "DELETED_POLICY",
        "CREATED_JOB_OPENING",
        "UPDATED_JOB_OPENING",
        "DELETED_JOB_OPENING",
        "CREATED_CANN_SETTLEMENT",
        "UPDATED_CANN_SETTLEMENT",
        "CREATED_HOLIDAY",
        "UPDATED_HOLIDAY",
        "DELETED_HOLIDAY",
        "CREATED_SHIFT",
        "UPDATED_SHIFT",
        "DELETED_SHIFT",
        "CREATED_GOAL",
        "UPDATED_GOAL",
        "DELETED_GOAL",
        "CREATED_APPRAISAL",
        "UPDATED_APPRAISAL",
        "DELETED_APPRAISAL",
        "CREATED_EXPENSE",
        "UPDATED_EXPENSE",
        "DELETED_EXPENSE",
        "CREATED_TRAVEL_REQUEST",
        "UPDATED_TRAVEL_REQUEST",
        "DELETED_TRAVEL_REQUEST",
        "CREATED_ASSET",
        "UPDATED_ASSET",
        "DELETED_ASSET",
        "CREATED_CLEARANCE",
        "UPDATED_CLEARANCE",
        "DELETED_CLEARANCE",
        "CREATED_RESIGNATION",
        "UPDATED_RESIGNATION",
        "DELETED_RESIGNATION",
        "CREATED_OVERTIME",
        "UPDATED_OVERTIME",
        "DELETED_OVERTIME",

        // Other actions
        "OTHER"
      ],
    },

    // Resource details (what was affected)
    resourceType: {
      type: String,
      enum: [
        "USER",
        "STUDENT",
        "MENTOR",
        "SCHOOL_ADMIN",
        "LEAD_MENTOR",
        "SUPER_ADMIN",
        "SCHOOL",
        "MODULE",
        "SESSION",
        "RESOURCE",
        "ASSESSMENT",
        "QUESTION",
        "CERTIFICATE",
        "NOTIFICATION",
        "MESSAGE",
        "FILE",
        "SYSTEM",
        "EMPLOYEE",
        "ATTENDANCE",
        "LEAVE",
        "PAYROLL",
        "SALARY_STRUCTURE",
        "STATUTORY_REPORT",
        "DESIGNATION",
        "DEPARTMENT",
        "BRANCH",
        "COMPANY",
        "COST_CENTER",
        "WORKING_DAY",
        "POLICY",
        "JOB_OPENING",
        "CANDIDATE",
        "FINAL_SETTLEMENT",
        "HOLIDAY",
        "SHIFT",
        "GOAL",
        "APPRAISAL",
        "EXPENSE",
        "TRAVEL_REQUEST",
        "ASSET",
        "RESIGNATION",
        "CLEARANCE",
        "WORKSTATION",
        "ACCESS_CARD",
        "LOCKER",
        "PARKING",
        "OVERTIME",
        "OTHER"
      ],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    resourceName: {
      type: String,
      default: null,
    },

    // Request details
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
    statusCode: {
      type: Number,
      required: true,
    },

    // Additional context
    description: {
      type: String,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // School context (for school-specific activities)
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
    },
    schoolName: {
      type: String,
      default: null,
    },

    // Severity level
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW",
    },

    // Success/failure status
    isSuccess: {
      type: Boolean,
      required: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },

    // Duration of the action (in milliseconds)
    duration: {
      type: Number,
      default: null,
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    // Add indexes for better query performance
    indexes: [
      { userId: 1, createdAt: -1 },
      { action: 1, createdAt: -1 },
      { resourceType: 1, createdAt: -1 },
      { schoolId: 1, createdAt: -1 },
      { isSuccess: 1, createdAt: -1 },
      { severity: 1, createdAt: -1 },
      { createdAt: -1 },
    ]
  }
);

// Add text index for searching
activityLogSchema.index({
  description: "text",
  userName: "text",
  userEmail: "text",
  resourceName: "text",
  schoolName: "text"
});

export default mongoose.model("ActivityLog", activityLogSchema);
