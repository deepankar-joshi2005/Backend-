"use strict";
/** @format */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDelete = exports.importData = exports.downloadSample = exports.exportData = exports.getModules = void 0;
const XLSX = __importStar(require("xlsx"));
const fs_1 = __importDefault(require("fs"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const Company_1 = __importDefault(require("../models/hrms/Company"));
const Branch_1 = __importDefault(require("../models/hrms/Branch"));
const Department_1 = __importDefault(require("../models/hrms/Department"));
const Designation_1 = __importDefault(require("../models/hrms/Designation"));
const Role_1 = __importDefault(require("../models/Role"));
const CostCenter_1 = __importDefault(require("../models/hrms/CostCenter"));
const LeaveType_1 = __importDefault(require("../models/hrms/LeaveType")); // Policies
const Holiday_1 = __importDefault(require("../models/hrms/Holiday"));
const SalaryStructure_1 = __importDefault(require("../models/hrms/SalaryStructure"));
const TaxSlab_1 = __importDefault(require("../models/hrms/TaxSlab"));
const User_1 = __importDefault(require("../models/User"));
const UserDocument_1 = __importDefault(require("../models/UserDocument"));
const Letter_1 = __importDefault(require("../models/hrms/Letter"));
const Attendance_1 = __importDefault(require("../models/hrms/Attendance"));
const Leave_1 = __importDefault(require("../models/hrms/Leave"));
const Payroll_1 = __importDefault(require("../models/hrms/Payroll"));
const Payslip_1 = __importDefault(require("../models/hrms/Payslip"));
const StatutoryReport_1 = __importDefault(require("../models/hrms/StatutoryReport"));
const Workstation_1 = __importDefault(require("../models/hrms/Workstation"));
const AssetInventory_1 = __importDefault(require("../models/hrms/AssetInventory"));
const NonITAsset_1 = __importDefault(require("../models/hrms/NonITAsset"));
const JobOpenings_1 = __importDefault(require("../models/hrms/JobOpenings"));
const Candidate_1 = __importDefault(require("../models/hrms/Candidate"));
const OnboardingTask_1 = __importDefault(require("../models/hrms/OnboardingTask"));
const ResignationRequest_1 = __importDefault(require("../models/hrms/ResignationRequest"));
const Clearance_1 = __importDefault(require("../models/hrms/Clearance"));
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const constants_1 = require("../constants");
// Modules that must never be bulk-imported — they're system-computed or
// compliance-sensitive records, not hand-editable master data. Export/Hard
// Delete still work; only /import is blocked for these.
const IMPORT_BLOCKED_MODULES = new Set(["Audit Logs", "Payroll", "Payslips"]);
// Helper to get model by name
const getModelByName = (moduleName) => {
    switch (moduleName) {
        // System Configuration
        case "Company":
        case "Companies":
            return Company_1.default;
        case "Branches":
            return Branch_1.default;
        case "Departments":
            return Department_1.default;
        case "Designations":
            return Designation_1.default;
        case "Roles":
            return Role_1.default;
        case "Cost Centers":
            return CostCenter_1.default;
        case "Policies":
            return LeaveType_1.default;
        case "Holidays":
            return Holiday_1.default;
        case "Salary Structures":
            return SalaryStructure_1.default;
        case "Tax Slabs":
            return TaxSlab_1.default;
        // User & HR
        case "Employees":
            return User_1.default;
        case "Documents":
            return UserDocument_1.default;
        case "Letters":
            return Letter_1.default;
        // Attendance & Leave
        case "Attendance":
            return Attendance_1.default;
        case "Leaves":
            return Leave_1.default;
        // Payroll & Finance
        case "Payroll":
            return Payroll_1.default;
        case "Payslips":
            return Payslip_1.default;
        case "Statutory Data":
            return StatutoryReport_1.default;
        // Assets
        case "Workstations":
            return Workstation_1.default;
        case "IT Assets":
            return AssetInventory_1.default;
        case "Non-IT Assets":
            return NonITAsset_1.default;
        // Recruitment
        case "Job Openings":
            return JobOpenings_1.default;
        case "Candidates":
            return Candidate_1.default;
        // Onboarding/Offboarding
        case "Onboarding Tasks":
            return OnboardingTask_1.default;
        case "Resignations":
            return ResignationRequest_1.default;
        case "Clearance":
            return Clearance_1.default;
        // Logs
        case "Audit Logs":
            return ActivityLog_1.default;
        default:
            return null;
    }
};
const getModules = async (req, res) => {
    try {
        const modules = [
            "Companies", "Branches", "Departments", "Designations", "Roles", "Cost Centers",
            "Policies", "Holidays", "Salary Structures", "Tax Slabs",
            "Employees", "Documents", "Letters",
            "Attendance", "Leaves",
            "Payroll", "Payslips", "Statutory Data",
            "Workstations", "IT Assets", "Non-IT Assets",
            "Job Openings", "Candidates",
            "Onboarding Tasks", "Resignations", "Clearance",
            "Audit Logs",
        ];
        res.status(200).json(modules);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching modules", error });
    }
};
exports.getModules = getModules;
// Helper to get column mapping for export/import
// Key: Database Field Name -> Value: CSV Header Name
const getColumnMapping = (moduleName) => {
    const commonFields = { createdAt: "Created Date", updatedAt: "Last Updated" };
    switch (moduleName) {
        case "Company":
        case "Companies":
            return {
                ...commonFields,
                name: "Company Name",
                email: "Email",
                phone: "Phone",
                website: "Website",
                industry: "Industry",
                city: "City",
                state: "State",
                address: "Address",
                status: "Status",
            };
        case "Branches":
            return {
                ...commonFields,
                name: "Branch Name",
                code: "Branch Code",
                companyId: "Company",
                city: "City",
                state: "State",
                country: "Country",
                status: "Status",
            };
        case "Departments":
            return {
                ...commonFields,
                name: "Department Name",
                headEmployeeId: "Head Employee ID",
                companyId: "Company",
                branchId: "Branch",
                status: "Status",
            };
        case "Designations":
            return {
                ...commonFields,
                name: "Designation Title",
                companyId: "Company",
                departmentId: "Department",
                status: "Status",
            };
        case "Roles":
            return {
                ...commonFields,
                name: "Role Name",
                status: "Status",
            };
        case "Cost Centers":
            return {
                ...commonFields,
                name: "Cost Center Name",
                code: "Code",
                description: "Description",
                status: "Status",
            };
        case "Policies": // LeaveType
            return {
                ...commonFields,
                name: "Policy Name",
                code: "Code",
                maxDays: "Max Days",
                paid: "Is Paid",
                carryForward: "Carry Forward",
                isActive: "Is Active",
            };
        case "Holidays":
            return {
                ...commonFields,
                title: "Holiday Name",
                date: "Date",
                day: "Day",
                isActive: "Is Active",
            };
        case "Salary Structures":
            return {
                ...commonFields,
                employee: "Employee ID",
                basic: "Basic",
                hra: "HRA",
                otherAllowance: "Other Allowance",
                pf: "PF",
                professionalTax: "Professional Tax",
                tds: "TDS",
                advance: "Advance",
                others: "Others",
            };
        case "Tax Slabs":
            return {
                ...commonFields,
                description: "Description",
                minIncome: "Min Income",
                maxIncome: "Max Income",
                percentage: "Tax Rate (%)",
            };
        case "Employees": // User
            return {
                ...commonFields,
                employeeId: "Employee ID",
                name: "Full Name",
                email: "Email",
                mobile: "Mobile",
                gender: "Gender",
                dob: "Date of Birth",
                role: "Role",
                companyId: "Company",
                branchId: "Branch",
                departmentId: "Department",
                designationId: "Designation",
                costCenterId: "Cost Center",
                managerId: "Reporting Manager",
                joiningDate: "Joining Date",
                employmentType: "Employment Type",
                status: "Status",
            };
        case "Documents":
            return {
                ...commonFields,
                user: "Employee ID",
                documentType: "Document Type",
                documentName: "Document Name",
                status: "Verification Status",
                verifiedAt: "Verified Date",
            };
        case "Letters":
            return {
                ...commonFields,
                user: "Employee ID",
                letterType: "Letter Type",
                fileName: "File Name",
                message: "Message",
            };
        case "Attendance":
            return {
                ...commonFields,
                user: "Employee ID",
                date: "Date",
                punchIn: "Punch In",
                punchOut: "Punch Out",
                status: "Status",
                totalWorkSeconds: "Total Work Seconds",
            };
        case "Leaves":
            return {
                ...commonFields,
                employee: "Employee ID",
                leaveType: "Leave Type",
                fromDate: "From Date",
                toDate: "To Date",
                reason: "Reason",
                status: "Approval Status",
                totalDays: "Total Days",
            };
        case "Payroll":
            return {
                ...commonFields,
                employee: "Employee ID",
                month: "Month",
                gross: "Gross Salary",
                deduction: "Total Deductions",
                net: "Net Salary",
                status: "Status",
            };
        case "Payslips":
            return {
                ...commonFields,
                user: "Employee ID",
                month: "Month",
                basic: "Basic Pay",
                hra: "HRA",
                otherAllowance: "Other Allowance",
                deduction: "Total Deductions",
                pf: "PF",
                professionalTax: "Professional Tax",
                tds: "TDS",
                advance: "Advance",
                others: "Others",
                netSalary: "Net Salary",
                status: "Status",
            };
        case "Statutory Data":
            return {
                ...commonFields,
                employee: "Employee ID",
                month: "Month",
                pf: "PF",
                esi: "ESI",
                pt: "Prof. Tax",
                tds: "TDS",
                grossSalary: "Gross Salary",
                totalDeduction: "Total Deduction",
                netSalary: "Net Salary",
            };
        case "Workstations":
            return {
                ...commonFields,
                employee: "Employee ID",
                location: "Location",
                building: "Building",
                floor: "Floor",
                deskCode: "Desk Code",
                seatType: "Seat Type",
                status: "Status",
                allocatedAt: "Allocated Date",
            };
        case "IT Assets": // AssetInventory
            return {
                ...commonFields,
                assetType: "Asset Type",
                serialNumber: "Serial Number",
                status: "Status",
                assignedTo: "Assigned To (User ID)",
            };
        case "Non-IT Assets":
            return {
                ...commonFields,
                assetCode: "Asset Code",
                assetCategory: "Category",
                assetName: "Name",
                quantity: "Quantity",
                status: "Status",
                location: "Location",
            };
        case "Job Openings":
            return {
                ...commonFields,
                jobTitle: "Job Title",
                department: "Department",
                location: "Location",
                openings: "Openings Count",
                status: "Status",
            };
        case "Candidates":
            return {
                ...commonFields,
                name: "Candidate Name",
                email: "Email",
                mobile: "Phone",
                jobTitle: "Job Applied For",
                status: "Hiring Status",
            };
        case "Onboarding Tasks":
            return {
                ...commonFields,
                task: "Task",
                employee: "Employee ID",
                department: "Department ID",
                assignedTo: "Assigned To (User ID)",
                status: "Status",
            };
        case "Resignations":
            return {
                ...commonFields,
                employee: "Employee ID",
                resignationType: "Type",
                reasonCategory: "Reason Category",
                reasonText: "Reason",
                status: "Status",
                expectedLastWorkingDay: "Expected Last Working Day",
            };
        case "Clearance":
            return {
                ...commonFields,
                employee: "Employee ID",
                lastWorkingDay: "Last Working Day",
                overallStatus: "Overall Status",
            };
        case "Audit Logs":
            return {
                ...commonFields,
                action: "Action",
                userName: "Performed By",
                userEmail: "Email",
                resourceType: "Module",
                resourceName: "Resource",
                description: "Description",
                severity: "Severity",
                isSuccess: "Success",
            };
        default:
            return null;
    }
};
const exportData = async (req, res) => {
    try {
        const { moduleName } = req.query;
        const Model = getModelByName(moduleName);
        if (!Model) {
            res.status(400).json({ message: "Invalid module name" });
            return;
        }
        const data = await Model.find().lean();
        const mapping = getColumnMapping(moduleName);
        let exportData = data;
        if (mapping) {
            const columnMap = mapping;
            if (data && data.length > 0) {
                exportData = data.map((item) => {
                    const filteredItem = {};
                    Object.keys(columnMap).forEach((key) => {
                        if (item[key] !== undefined && item[key] !== null) {
                            filteredItem[columnMap[key]] = item[key];
                        }
                        else {
                            filteredItem[columnMap[key]] = "";
                        }
                    });
                    return filteredItem;
                });
            }
            else {
                exportData = [];
            }
        }
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, moduleName.slice(0, 31));
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "csv" });
        res.header("Content-Type", "text/csv");
        res.attachment(`${moduleName}_export_${new Date().toISOString().split("T")[0]}.csv`);
        res.send(buffer);
    }
    catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ message: "Error exporting data", error });
    }
};
exports.exportData = exportData;
// Helper to get dummy sample data for each module
const getSampleData = (moduleName) => {
    switch (moduleName) {
        case "Company":
        case "Companies":
            return [{
                    "Company Name": "Techize Builder",
                    "Email": "info@techize.com",
                    "Phone": "9876543210",
                    "Website": "www.techize.com",
                    "Industry": "IT Services",
                    "City": "Indore",
                    "State": "Madhya Pradesh",
                    "Address": "123 Tech Park",
                    "Status": "Active",
                }];
        case "Branches":
            return [{
                    "Branch Name": "Main Branch",
                    "Branch Code": "BR001",
                    "Company": "Techize Builder",
                    "City": "Indore",
                    "State": "MP",
                    "Country": "India",
                    "Status": "Active",
                }];
        case "Departments":
            return [{
                    "Department Name": "Human Resources",
                    "Company": "Techize Builder",
                    "Branch": "Main Branch",
                    "Head Employee ID": "",
                    "Status": "Active",
                }];
        case "Designations":
            return [{
                    "Designation Title": "Software Engineer",
                    "Company": "Techize Builder",
                    "Department": "Engineering",
                    "Status": "Active",
                }];
        case "Roles":
            return [{ "Role Name": "manager", "Status": "Active" }];
        case "Holidays":
            return [{ "Holiday Name": "Diwali", "Date": "2026-11-01", "Day": "Sunday", "Is Active": "TRUE" }];
        case "Employees":
            return [{
                    "Employee ID": "EMP001",
                    "Full Name": "John Doe",
                    "Email": "john@example.com",
                    "Mobile": "9988776655",
                    "Gender": "Male",
                    "Date of Birth": "1995-05-15",
                    "Role": "mentor",
                    "Company": "Techize Builder",
                    "Branch": "Main Branch",
                    "Department": "Human Resources",
                    "Designation": "HR Executive",
                    "Cost Center": "",
                    "Reporting Manager": "",
                    "Joining Date": "2026-01-01",
                    "Employment Type": "Full-Time",
                    "Status": "ACTIVE",
                }];
        default:
            return [];
    }
};
const downloadSample = async (req, res) => {
    try {
        const { moduleName } = req.query;
        const mapping = getColumnMapping(moduleName);
        if (!mapping) {
            res.status(400).json({ message: "Invalid module name or no mapping available" });
            return;
        }
        let sampleData = getSampleData(moduleName);
        if (sampleData.length === 0) {
            const emptyRow = {};
            Object.values(mapping).forEach((header) => {
                emptyRow[header] = "";
                if (header.includes("Date"))
                    emptyRow[header] = "YYYY-MM-DD";
                if (header.includes("Email"))
                    emptyRow[header] = "example@mail.com";
            });
            sampleData = [emptyRow];
        }
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "csv" });
        res.header("Content-Type", "text/csv");
        res.attachment(`${moduleName}_sample.csv`);
        res.send(buffer);
    }
    catch (error) {
        console.error("Sample Download Error:", error);
        res.status(500).json({ message: "Error downloading sample", error });
    }
};
exports.downloadSample = downloadSample;
// Modules whose target schema requires a `companyId` that we should derive
// from the resolved employee/user reference rather than ask for in the CSV.
const COMPANY_DERIVED_MODULES = new Set([
    "Attendance", "Leaves", "Salary Structures", "Statutory Data", "Onboarding Tasks", "Resignations", "Clearance",
]);
const resolveAndValidateData = async (moduleName, rows, mapping, userId, actingUser) => {
    const validRows = [];
    const errors = [];
    const reverseMapping = {};
    Object.entries(mapping).forEach(([dbField, csvHeader]) => {
        reverseMapping[csvHeader] = dbField;
    });
    const cache = {
        companies: new Map(),
        branches: new Map(),
        departments: new Map(),
        designations: new Map(),
        users: new Map(),
        roles: new Map(),
        emails: new Map(),
        employeeIds: new Map(),
        employeeCompany: new Map(),
    };
    try {
        if (["Branches", "Departments", "Designations", "Employees", "Roles", "Holidays"].includes(moduleName)) {
            const companies = await Company_1.default.find().select("_id name").lean();
            companies.forEach((c) => cache.companies.set(c.name.toLowerCase().trim(), c._id));
        }
        if (["Departments", "Employees"].includes(moduleName)) {
            const branches = await Branch_1.default.find().select("_id name").lean();
            branches.forEach((b) => cache.branches.set(b.name.toLowerCase().trim(), b._id));
        }
        if (["Designations", "Employees"].includes(moduleName)) {
            const departments = await Department_1.default.find().select("_id name").lean();
            departments.forEach((d) => cache.departments.set(d.name.toLowerCase().trim(), d._id));
        }
        if (moduleName === "Employees") {
            const designations = await Designation_1.default.find().select("_id name").lean();
            designations.forEach((d) => cache.designations.set(d.name.toLowerCase().trim(), d._id));
            const roles = await Role_1.default.find().select("_id name").lean();
            roles.forEach((r) => cache.roles.set(r.name.toLowerCase().trim(), r._id));
            const users = await User_1.default.find().select("_id employeeId email").lean();
            users.forEach((u) => {
                if (u.employeeId)
                    cache.employeeIds.set(u.employeeId.toLowerCase().trim(), u._id);
                if (u.email)
                    cache.emails.set(u.email.toLowerCase().trim(), u._id);
            });
        }
        if (COMPANY_DERIVED_MODULES.has(moduleName)) {
            const users = await User_1.default.find().select("_id employeeId companyId").lean();
            users.forEach((u) => {
                if (u.employeeId) {
                    cache.employeeIds.set(u.employeeId.toLowerCase().trim(), u._id);
                    cache.employeeCompany.set(String(u._id), u.companyId);
                }
            });
        }
        if (moduleName === "Companies") {
            const companies = await Company_1.default.find().select("name email").lean();
            companies.forEach((c) => {
                cache.companies.set(c.name.toLowerCase().trim(), c._id);
                if (c.email)
                    cache.emails.set(c.email.toLowerCase().trim(), c._id);
            });
        }
        if (moduleName === "Branches") {
            const branches = await Branch_1.default.find().select("name").lean();
            branches.forEach((b) => cache.branches.set(b.name.toLowerCase().trim(), b._id));
        }
        if (moduleName === "Departments") {
            const departments = await Department_1.default.find().select("name").lean();
            departments.forEach((d) => cache.departments.set(d.name.toLowerCase().trim(), d._id));
        }
        if (moduleName === "Designations") {
            const designations = await Designation_1.default.find().select("name").lean();
            designations.forEach((d) => cache.designations.set(d.name.toLowerCase().trim(), d._id));
        }
        if (moduleName === "Roles") {
            const roles = await Role_1.default.find().select("name").lean();
            roles.forEach((r) => cache.roles.set(r.name.toLowerCase().trim(), r._id));
        }
    }
    catch (err) {
        console.error("Error pre-fetching data:", err);
        return { validRows: [], errors: ["System error during validation preparation."] };
    }
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let rowError = `Row ${i + 2}: `;
        let isValid = true;
        const newRow = { createdBy: userId };
        const normalizedRow = {};
        Object.keys(row).forEach((key) => {
            normalizedRow[key.trim()] = row[key];
        });
        Object.keys(normalizedRow).forEach((csvKey) => {
            let dbKey = reverseMapping[csvKey];
            if (!dbKey) {
                const lowerKey = csvKey.toLowerCase();
                const matchedHeader = Object.keys(reverseMapping).find((k) => k.toLowerCase() === lowerKey);
                if (matchedHeader)
                    dbKey = reverseMapping[matchedHeader];
            }
            if (dbKey) {
                let val = normalizedRow[csvKey];
                if (["date", "dob", "joiningDate", "fromDate", "toDate", "dueDate", "expectedLastWorkingDay", "lastWorkingDay", "allocatedAt", "verifiedAt"].includes(dbKey)) {
                    const parsedDate = parseImportDate(val);
                    if (parsedDate)
                        val = parsedDate;
                }
                newRow[dbKey] = val;
            }
        });
        try {
            if (moduleName === "Companies" || moduleName === "Company") {
                if (!newRow.name || !newRow.email) {
                    isValid = false;
                    rowError += "Name and Email are required. ";
                }
                else if (cache.emails.has(newRow.email.toLowerCase().trim())) {
                    isValid = false;
                    rowError += `Company Email '${newRow.email}' already exists. `;
                }
                else {
                    const now = new Date();
                    const year = now.getFullYear().toString().slice(-2);
                    const month = String(now.getMonth() + 1).padStart(2, "0");
                    const prefix = `${year}${month}`;
                    let lastBatchId = cache.companies.get("_lastGeneratedId");
                    if (lastBatchId === undefined) {
                        const lastCompany = await Company_1.default.findOne({ companyId: new RegExp(`^${prefix}`) }).sort({ companyId: -1 }).lean();
                        lastBatchId = (lastCompany === null || lastCompany === void 0 ? void 0 : lastCompany.companyId) && lastCompany.companyId.startsWith(prefix)
                            ? parseInt(lastCompany.companyId.slice(4))
                            : 0;
                    }
                    const nextId = lastBatchId + 1;
                    newRow.companyId = prefix + String(nextId).padStart(4, "0");
                    cache.companies.set("_lastGeneratedId", nextId);
                }
            }
            else if (moduleName === "Branches") {
                const compVal = normalizedRow["Company"];
                const compId = resolveId(compVal, cache.companies);
                if (compId)
                    newRow.companyId = compId;
                else {
                    isValid = false;
                    rowError += `Company '${compVal}' not found. `;
                }
                if (newRow.name && cache.branches.has(newRow.name.toLowerCase().trim())) {
                    isValid = false;
                    rowError += `Branch Name '${newRow.name}' already exists. `;
                }
            }
            else if (moduleName === "Departments") {
                const compVal = normalizedRow["Company"];
                const compId = resolveId(compVal, cache.companies);
                if (compId)
                    newRow.companyId = compId;
                else {
                    isValid = false;
                    rowError += `Company '${compVal}' not found. `;
                }
                const branchVal = normalizedRow["Branch"];
                const branchId = resolveId(branchVal, cache.branches);
                if (branchId)
                    newRow.branchId = branchId;
                else {
                    isValid = false;
                    rowError += `Branch '${branchVal}' not found. `;
                }
                if (newRow.name && cache.departments.has(newRow.name.toLowerCase().trim())) {
                    isValid = false;
                    rowError += `Department Name '${newRow.name}' already exists. `;
                }
            }
            else if (moduleName === "Designations") {
                const compVal = normalizedRow["Company"];
                const compId = resolveId(compVal, cache.companies);
                if (compId)
                    newRow.companyId = compId;
                else {
                    isValid = false;
                    rowError += `Company '${compVal}' not found. `;
                }
                const depVal = normalizedRow["Department"];
                const depId = resolveId(depVal, cache.departments);
                if (depId)
                    newRow.departmentId = depId;
                else {
                    isValid = false;
                    rowError += `Department '${depVal}' not found. `;
                }
                if (newRow.name && cache.designations.has(newRow.name.toLowerCase().trim())) {
                    isValid = false;
                    rowError += `Designation '${newRow.name}' already exists. `;
                }
            }
            else if (moduleName === "Roles") {
                if (newRow.name && cache.roles.has(newRow.name.toLowerCase().trim())) {
                    isValid = false;
                    rowError += `Role '${newRow.name}' already exists. `;
                }
            }
            else if (moduleName === "Holidays") {
                // Holiday.companyId is required, but the CSV has no Company column.
                // Mirror addHoliday: scope to the importing user's own company; only
                // fall back to a system-wide lookup when the account has none.
                if (actingUser && !actingUser.isSystemAdmin && actingUser.role !== constants_1.ROLES.HRMSAdmin && actingUser.companyId) {
                    newRow.companyId = actingUser.companyId;
                }
                else if (cache.companies.size === 1) {
                    newRow.companyId = cache.companies.values().next().value;
                }
                else {
                    isValid = false;
                    rowError += "Could not determine the company for this holiday (multiple companies exist and your account isn't scoped to one). ";
                }
                if (!newRow.title || !newRow.date) {
                    isValid = false;
                    rowError += "Holiday Name and Date are required. ";
                }
                else {
                    // Day of week is derived, not user-entered — recompute it so a
                    // wrong/missing "Day" column can't desync from the actual date.
                    const parsedDate = newRow.date instanceof Date ? newRow.date : new Date(newRow.date);
                    if (!isNaN(parsedDate.getTime())) {
                        newRow.day = parsedDate.toLocaleDateString("en-US", { weekday: "long" });
                    }
                    else {
                        isValid = false;
                        rowError += "Date is invalid. ";
                    }
                }
            }
            else if (moduleName === "Employees") {
                if (newRow.employeeId && cache.employeeIds.has(newRow.employeeId.toLowerCase().trim())) {
                    isValid = false;
                    rowError += `Employee ID '${newRow.employeeId}' already exists. `;
                }
                if (newRow.email && cache.emails.has(newRow.email.toLowerCase().trim())) {
                    isValid = false;
                    rowError += `Email '${newRow.email}' already exists. `;
                }
                const compVal = normalizedRow["Company"];
                if (compVal) {
                    const id = resolveId(compVal, cache.companies);
                    if (id)
                        newRow.companyId = id;
                    else {
                        isValid = false;
                        rowError += `Company '${compVal}' not found. `;
                    }
                }
                else if (cache.companies.size === 1) {
                    newRow.companyId = cache.companies.values().next().value;
                }
                const branchVal = normalizedRow["Branch"];
                if (branchVal) {
                    const id = resolveId(branchVal, cache.branches);
                    if (id)
                        newRow.branchId = id;
                    else {
                        isValid = false;
                        rowError += `Branch '${branchVal}' not found. `;
                    }
                }
                const depVal = normalizedRow["Department"];
                if (depVal) {
                    const id = resolveId(depVal, cache.departments);
                    if (id)
                        newRow.departmentId = id;
                    else {
                        isValid = false;
                        rowError += `Department '${depVal}' not found. `;
                    }
                }
                const desigVal = normalizedRow["Designation"];
                if (desigVal) {
                    const id = resolveId(desigVal, cache.designations);
                    if (id)
                        newRow.designationId = id;
                    else {
                        isValid = false;
                        rowError += `Designation '${desigVal}' not found. `;
                    }
                }
                const roleVal = newRow.role;
                if (roleVal && !cache.roles.has(roleVal.toLowerCase().trim())) {
                    isValid = false;
                    rowError += `Role '${roleVal}' not found in system roles. `;
                }
                const managerVal = normalizedRow["Reporting Manager"];
                if (managerVal) {
                    try {
                        const manager = await User_1.default.findOne({ email: managerVal.toLowerCase().trim() }).select("_id");
                        newRow.managerId = (manager === null || manager === void 0 ? void 0 : manager._id) || null;
                    }
                    catch {
                        newRow.managerId = null;
                    }
                }
                else {
                    newRow.managerId = null;
                }
                const ccVal = normalizedRow["Cost Center"];
                if (ccVal) {
                    try {
                        const query = { name: { $regex: new RegExp(`^${ccVal}$`, "i") } };
                        if (newRow.companyId)
                            query.companyId = newRow.companyId;
                        const costCenter = await CostCenter_1.default.findOne(query).select("_id");
                        newRow.costCenterId = (costCenter === null || costCenter === void 0 ? void 0 : costCenter._id) || null;
                    }
                    catch {
                        newRow.costCenterId = null;
                    }
                }
                else {
                    newRow.costCenterId = null;
                }
                if (!newRow.email || !newRow.name) {
                    isValid = false;
                    rowError += "Name and Email are required. ";
                }
                if (!newRow.companyId || !newRow.branchId || !newRow.departmentId || !newRow.designationId) {
                    isValid = false;
                    rowError += "Company, Branch, Department, and Designation are required. ";
                }
                if (!newRow.employmentStatus)
                    newRow.employmentStatus = "PROBATION";
                if (!newRow.status)
                    newRow.status = "ACTIVE";
                // NOTE: password is hashed in bulk after validation (insertMany skips
                // Mongoose pre('save') hooks, so plaintext would otherwise be stored).
                if (!newRow.password)
                    newRow.password = "Password@123";
                if (newRow.joiningDate) {
                    const joining = new Date(newRow.joiningDate);
                    const probEnd = new Date(joining);
                    probEnd.setMonth(probEnd.getMonth() + 6);
                    newRow.probationEndDate = probEnd;
                    newRow.probationPeriod = 6;
                }
            }
            // Transactional modules keyed off an employee — resolve the reference
            // and (if the schema requires it) derive companyId from that employee.
            if (["Attendance", "Leaves", "Salary Structures", "Statutory Data", "Onboarding Tasks", "Resignations", "Clearance"].includes(moduleName)) {
                const empVal = normalizedRow["Employee ID"];
                if (empVal) {
                    const id = resolveId(empVal, cache.employeeIds);
                    if (id) {
                        if (newRow.user)
                            newRow.user = id;
                        if (newRow.employee)
                            newRow.employee = id;
                        if (COMPANY_DERIVED_MODULES.has(moduleName)) {
                            const companyId = cache.employeeCompany.get(String(id));
                            if (companyId)
                                newRow.companyId = companyId;
                        }
                    }
                    else {
                        isValid = false;
                        rowError += `Employee ID '${empVal}' not found. `;
                    }
                }
            }
        }
        catch (e) {
            console.error("Row validation error:", e);
            isValid = false;
            rowError += "Unexpected validation error. ";
        }
        if (isValid)
            validRows.push(newRow);
        else
            errors.push(rowError);
    }
    return { validRows, errors };
};
const resolveId = (nameOrId, map) => {
    if (!nameOrId)
        return null;
    const clean = nameOrId.toString().toLowerCase().trim();
    if (mongoose_1.default.Types.ObjectId.isValid(nameOrId))
        return nameOrId;
    return map.get(clean) || null;
};
const parseImportDate = (value) => {
    if (!value)
        return null;
    if (value instanceof Date)
        return value;
    if (typeof value === "number") {
        return new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    const dateStr = value.toString().trim();
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(dateStr)) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime()))
            return d;
    }
    const parts = dateStr.split(/[-/.]/);
    if (parts.length === 3) {
        let d, m, y;
        if (parts[0].length === 4) {
            y = parseInt(parts[0]);
            m = parseInt(parts[1]) - 1;
            d = parseInt(parts[2]);
        }
        else {
            d = parseInt(parts[0]);
            m = parseInt(parts[1]) - 1;
            y = parseInt(parts[2]);
            if (y < 100)
                y += 2000;
        }
        const dateObj = new Date(Date.UTC(y, m, d));
        if (!isNaN(dateObj.getTime()))
            return dateObj;
    }
    const generic = new Date(dateStr);
    if (!isNaN(generic.getTime()))
        return generic;
    return null;
};
const importData = async (req, res) => {
    var _a, _b;
    const file = req.file;
    try {
        if (!file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }
        const { moduleName } = req.body;
        if (IMPORT_BLOCKED_MODULES.has(moduleName)) {
            if (file.path && fs_1.default.existsSync(file.path))
                fs_1.default.unlinkSync(file.path);
            res.status(400).json({
                message: `'${moduleName}' is system-generated and cannot be bulk-imported.`,
            });
            return;
        }
        const Model = getModelByName(moduleName);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!Model) {
            if (file.path && fs_1.default.existsSync(file.path))
                fs_1.default.unlinkSync(file.path);
            res.status(400).json({ message: "Invalid module name" });
            return;
        }
        const workbook = XLSX.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        const mapping = getColumnMapping(moduleName);
        let finalRows = [];
        let errors = [];
        if (mapping && rows.length > 0) {
            const result = await resolveAndValidateData(moduleName, rows, mapping, userId, req.user);
            finalRows = result.validRows;
            errors = result.errors;
        }
        else {
            finalRows = rows.map((row) => ({ ...row, createdBy: userId }));
        }
        if (moduleName === "Employees") {
            for (const row of finalRows) {
                if (row.password)
                    row.password = await bcrypt_1.default.hash(row.password, 10);
            }
        }
        let insertedCount = 0;
        if (finalRows.length > 0) {
            try {
                // With `ordered: false`, Mongoose silently drops documents that fail
                // schema validation (e.g. a missing required field) instead of
                // throwing — it just resolves with the subset that actually saved.
                // Compare against finalRows.length so that case is never reported
                // as a full success.
                const inserted = await Model.insertMany(finalRows, { ordered: false });
                insertedCount = inserted.length;
                if (insertedCount < finalRows.length) {
                    errors.push(`${finalRows.length - insertedCount} row(s) passed initial checks but were rejected while saving (likely missing/invalid required fields for this module).`);
                }
            }
            catch (dbError) {
                console.error("Database Import Error:", dbError);
                insertedCount = ((_b = dbError.insertedDocs) === null || _b === void 0 ? void 0 : _b.length) || 0;
                if (dbError.writeErrors) {
                    dbError.writeErrors.forEach((e) => { var _a; return errors.push(`DB Error Row: ${((_a = e.err) === null || _a === void 0 ? void 0 : _a.errmsg) || e.errmsg}`); });
                }
                else {
                    errors.push(`DB Error: ${dbError.message}`);
                }
            }
        }
        if (file.path && fs_1.default.existsSync(file.path))
            fs_1.default.unlinkSync(file.path);
        res.status(200).json({
            message: errors.length > 0 ? "Data imported with some errors" : "Data imported successfully",
            count: insertedCount,
            errors: errors.slice(0, 10),
        });
    }
    catch (error) {
        console.error("Import Error:", error);
        if (file && file.path && fs_1.default.existsSync(file.path))
            fs_1.default.unlinkSync(file.path);
        res.status(500).json({ message: "Error importing data", error: error.message });
    }
};
exports.importData = importData;
const hardDelete = async (req, res) => {
    try {
        const { moduleNames, confirmation } = req.body;
        if (confirmation !== "DELETE") {
            res.status(400).json({ message: 'Invalid confirmation string. Please type "DELETE".' });
            return;
        }
        if (!moduleNames || !Array.isArray(moduleNames) || moduleNames.length === 0) {
            res.status(400).json({ message: "Please select at least one module." });
            return;
        }
        const results = [];
        const errors = [];
        for (const moduleName of moduleNames) {
            const Model = getModelByName(moduleName);
            if (!Model) {
                errors.push(`Invalid module: ${moduleName}`);
                continue;
            }
            try {
                const deleteResult = await Model.deleteMany({});
                results.push({ module: moduleName, deletedCount: deleteResult.deletedCount });
            }
            catch (err) {
                console.error(`Error deleting ${moduleName}:`, err);
                errors.push(`Failed to delete ${moduleName}: ${err.message}`);
            }
        }
        res.status(200).json({
            message: "Bulk delete operation completed.",
            results,
            errors,
        });
    }
    catch (error) {
        console.error("Hard Delete Error:", error);
        res.status(500).json({ message: "Error deleting data", error: error.message });
    }
};
exports.hardDelete = hardDelete;
