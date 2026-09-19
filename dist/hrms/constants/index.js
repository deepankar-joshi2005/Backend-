"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbName = exports.PERMISSIONS = exports.ROLES = void 0;
exports.ROLES = {
    SuperAdmin: "superadmin",
    LeadMentor: "leadmentor",
    SchoolAdmin: "schooladmin",
    Mentor: "mentor",
    Student: "student",
    Guest: "guest",
    SalesManager: "sales-manager",
    SalesExecutive: "sales-executive",
    HRAdmin: "hr-admin",
    Manager: "manager",
    Finance: "finance",
    ITAdmin: "IT-Admin",
    Admin: "Admin",
    Auditor: "auditor",
    HRMSAdmin: "HRMS-Admin",
};
exports.PERMISSIONS = {
    ADD_RESOURCES: "add_resources",
    ADD_MODULES: "add_modules",
    ADD_STUDENTS: "add_students",
    ADD_ADMINS: "add_admins",
    ADD_MENTORS: "add_mentors",
    CREATE_ASSESSMENTS: "create_assessments",
    MANAGE_ASSESSMENTS: "manage_assessments",
    CERTIFICATE_MANAGE: "certificate_manage",
    CERTIFICATE_VIEW: "certificate_view",
};
// Same physical database as CA-Backend — every HRMS collection name is unique
// against CA-Management's own models except User, which is explicitly renamed
// to "hrms_users" (see models/User.ts) to avoid colliding on that shared database.
exports.dbName = "ca-management";
