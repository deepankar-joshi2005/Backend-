export const ROLES = {
  SuperAdmin: "superadmin",
  LeadMentor: "leadmentor",
  SchoolAdmin: "schooladmin",
  Mentor: "mentor", // legacy value for the Employee role — canonical value is now Employee ("employee")
  Employee: "employee",
  Student: "student",
  Guest: "guest",
  SalesManager: "sales-manager",
  SalesExecutive: "sales-executive",
  HRAdmin:"hr-admin",
  Manager:"manager",
  Finance:"finance",
  ITAdmin:"IT-Admin",
  Admin:"Admin",
  Auditor:"auditor",
  HRMSAdmin: "HRMS-Admin",
} as const;

export const PERMISSIONS = {
  ADD_RESOURCES: "add_resources",
  ADD_MODULES: "add_modules", 
  ADD_STUDENTS: "add_students",
  ADD_ADMINS: "add_admins",
  ADD_MENTORS: "add_mentors",
  CREATE_ASSESSMENTS: "create_assessments",
  MANAGE_ASSESSMENTS: "manage_assessments",
  CERTIFICATE_MANAGE: "certificate_manage",
  CERTIFICATE_VIEW: "certificate_view",
} as const;

// Same physical database as CA-Backend — every HRMS collection name is unique
// against CA-Management's own models except User, which is explicitly renamed
// to "hrms_users" (see models/User.ts) to avoid colliding on that shared database.
export const dbName = "ca-management";
