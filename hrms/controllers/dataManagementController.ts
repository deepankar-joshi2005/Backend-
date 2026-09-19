/** @format */

import { Response } from "express";
import * as XLSX from "xlsx";
import fs from "fs";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";

import Company from "../models/hrms/Company";
import Branch from "../models/hrms/Branch";
import Department from "../models/hrms/Department";
import Designation from "../models/hrms/Designation";
import Role from "../models/Role";
import CostCenter from "../models/hrms/CostCenter";
import LeaveType from "../models/hrms/LeaveType"; // Policies
import Holiday from "../models/hrms/Holiday";
import SalaryStructure from "../models/hrms/SalaryStructure";
import TaxSlab from "../models/hrms/TaxSlab";
import User from "../models/User";
import UserDocument from "../models/UserDocument";
import Letter from "../models/hrms/Letter";
import Attendance from "../models/hrms/Attendance";
import Leave from "../models/hrms/Leave";
import Payroll from "../models/hrms/Payroll";
import Payslip from "../models/hrms/Payslip";
import StatutoryReport from "../models/hrms/StatutoryReport";
import Workstation from "../models/hrms/Workstation";
import AssetInventory from "../models/hrms/AssetInventory";
import NonITAsset from "../models/hrms/NonITAsset";
import JobOpenings from "../models/hrms/JobOpenings";
import Candidate from "../models/hrms/Candidate";
import OnboardingTask from "../models/hrms/OnboardingTask";
import ResignationRequest from "../models/hrms/ResignationRequest";
import Clearance from "../models/hrms/Clearance";
import ActivityLog from "../models/ActivityLog";
import { ROLES } from "../constants";

// Modules that must never be bulk-imported — they're system-computed or
// compliance-sensitive records, not hand-editable master data. Export/Hard
// Delete still work; only /import is blocked for these.
const IMPORT_BLOCKED_MODULES = new Set(["Audit Logs", "Payroll", "Payslips"]);

// Helper to get model by name
const getModelByName = (moduleName: string): any => {
  switch (moduleName) {
    // System Configuration
    case "Company":
    case "Companies":
      return Company;
    case "Branches":
      return Branch;
    case "Departments":
      return Department;
    case "Designations":
      return Designation;
    case "Roles":
      return Role;
    case "Cost Centers":
      return CostCenter;
    case "Policies":
      return LeaveType;
    case "Holidays":
      return Holiday;
    case "Salary Structures":
      return SalaryStructure;
    case "Tax Slabs":
      return TaxSlab;

    // User & HR
    case "Employees":
      return User;
    case "Documents":
      return UserDocument;
    case "Letters":
      return Letter;

    // Attendance & Leave
    case "Attendance":
      return Attendance;
    case "Leaves":
      return Leave;

    // Payroll & Finance
    case "Payroll":
      return Payroll;
    case "Payslips":
      return Payslip;
    case "Statutory Data":
      return StatutoryReport;

    // Assets
    case "Workstations":
      return Workstation;
    case "IT Assets":
      return AssetInventory;
    case "Non-IT Assets":
      return NonITAsset;

    // Recruitment
    case "Job Openings":
      return JobOpenings;
    case "Candidates":
      return Candidate;

    // Onboarding/Offboarding
    case "Onboarding Tasks":
      return OnboardingTask;
    case "Resignations":
      return ResignationRequest;
    case "Clearance":
      return Clearance;

    // Logs
    case "Audit Logs":
      return ActivityLog;

    default:
      return null;
  }
};

export const getModules = async (req: AuthRequest, res: Response): Promise<void> => {
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
  } catch (error) {
    res.status(500).json({ message: "Error fetching modules", error });
  }
};

// Helper to get column mapping for export/import
// Key: Database Field Name -> Value: CSV Header Name
const getColumnMapping = (moduleName: string): Record<string, string> | null => {
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

export const exportData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { moduleName } = req.query;
    const Model = getModelByName(moduleName as string);

    if (!Model) {
      res.status(400).json({ message: "Invalid module name" });
      return;
    }

    const data = await Model.find().lean();

    const mapping = getColumnMapping(moduleName as string);
    let exportData = data;

    if (mapping) {
      const columnMap = mapping;
      if (data && data.length > 0) {
        exportData = data.map((item: any) => {
          const filteredItem: any = {};
          Object.keys(columnMap).forEach((key) => {
            if (item[key] !== undefined && item[key] !== null) {
              filteredItem[columnMap[key]] = item[key];
            } else {
              filteredItem[columnMap[key]] = "";
            }
          });
          return filteredItem;
        });
      } else {
        exportData = [];
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, (moduleName as string).slice(0, 31));

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "csv" });

    res.header("Content-Type", "text/csv");
    res.attachment(`${moduleName}_export_${new Date().toISOString().split("T")[0]}.csv`);
    res.send(buffer);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ message: "Error exporting data", error });
  }
};

// Helper to get dummy sample data for each module
const getSampleData = (moduleName: string): any[] => {
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
        "Role": "employee",
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

export const downloadSample = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { moduleName } = req.query;
    const mapping = getColumnMapping(moduleName as string);

    if (!mapping) {
      res.status(400).json({ message: "Invalid module name or no mapping available" });
      return;
    }

    let sampleData = getSampleData(moduleName as string);

    if (sampleData.length === 0) {
      const emptyRow: any = {};
      Object.values(mapping).forEach((header) => {
        emptyRow[header] = "";
        if (header.includes("Date")) emptyRow[header] = "YYYY-MM-DD";
        if (header.includes("Email")) emptyRow[header] = "example@mail.com";
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
  } catch (error) {
    console.error("Sample Download Error:", error);
    res.status(500).json({ message: "Error downloading sample", error });
  }
};

// Modules whose target schema requires a `companyId` that we should derive
// from the resolved employee/user reference rather than ask for in the CSV.
const COMPANY_DERIVED_MODULES = new Set([
  "Attendance", "Leaves", "Salary Structures", "Statutory Data", "Onboarding Tasks", "Resignations", "Clearance",
]);

const resolveAndValidateData = async (
  moduleName: string,
  rows: any[],
  mapping: Record<string, string>,
  userId: any,
  actingUser: any
): Promise<{ validRows: any[]; errors: string[] }> => {
  const validRows: any[] = [];
  const errors: string[] = [];

  const reverseMapping: Record<string, string> = {};
  Object.entries(mapping).forEach(([dbField, csvHeader]) => {
    reverseMapping[csvHeader] = dbField;
  });

  const cache: Record<string, Map<string, any>> = {
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
      const companies = await Company.find().select("_id name").lean();
      companies.forEach((c: any) => cache.companies.set(c.name.toLowerCase().trim(), c._id));
    }

    if (["Departments", "Employees"].includes(moduleName)) {
      const branches = await Branch.find().select("_id name").lean();
      branches.forEach((b: any) => cache.branches.set(b.name.toLowerCase().trim(), b._id));
    }

    if (["Designations", "Employees"].includes(moduleName)) {
      const departments = await Department.find().select("_id name").lean();
      departments.forEach((d: any) => cache.departments.set(d.name.toLowerCase().trim(), d._id));
    }

    if (moduleName === "Employees") {
      const designations = await Designation.find().select("_id name").lean();
      designations.forEach((d: any) => cache.designations.set(d.name.toLowerCase().trim(), d._id));

      const roles = await Role.find().select("_id name").lean();
      roles.forEach((r: any) => cache.roles.set(r.name.toLowerCase().trim(), r._id));

      const users = await User.find().select("_id employeeId email").lean();
      users.forEach((u: any) => {
        if (u.employeeId) cache.employeeIds.set(u.employeeId.toLowerCase().trim(), u._id);
        if (u.email) cache.emails.set(u.email.toLowerCase().trim(), u._id);
      });
    }

    if (COMPANY_DERIVED_MODULES.has(moduleName)) {
      const users = await User.find().select("_id employeeId companyId").lean();
      users.forEach((u: any) => {
        if (u.employeeId) {
          cache.employeeIds.set(u.employeeId.toLowerCase().trim(), u._id);
          cache.employeeCompany.set(String(u._id), u.companyId);
        }
      });
    }

    if (moduleName === "Companies") {
      const companies = await Company.find().select("name email").lean();
      companies.forEach((c: any) => {
        cache.companies.set(c.name.toLowerCase().trim(), c._id);
        if (c.email) cache.emails.set(c.email.toLowerCase().trim(), c._id);
      });
    }
    if (moduleName === "Branches") {
      const branches = await Branch.find().select("name").lean();
      branches.forEach((b: any) => cache.branches.set(b.name.toLowerCase().trim(), b._id));
    }
    if (moduleName === "Departments") {
      const departments = await Department.find().select("name").lean();
      departments.forEach((d: any) => cache.departments.set(d.name.toLowerCase().trim(), d._id));
    }
    if (moduleName === "Designations") {
      const designations = await Designation.find().select("name").lean();
      designations.forEach((d: any) => cache.designations.set(d.name.toLowerCase().trim(), d._id));
    }
    if (moduleName === "Roles") {
      const roles = await Role.find().select("name").lean();
      roles.forEach((r: any) => cache.roles.set(r.name.toLowerCase().trim(), r._id));
    }
  } catch (err) {
    console.error("Error pre-fetching data:", err);
    return { validRows: [], errors: ["System error during validation preparation."] };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let rowError = `Row ${i + 2}: `;
    let isValid = true;
    const newRow: any = { createdBy: userId };

    const normalizedRow: any = {};
    Object.keys(row).forEach((key) => {
      normalizedRow[key.trim()] = row[key];
    });

    Object.keys(normalizedRow).forEach((csvKey) => {
      let dbKey = reverseMapping[csvKey];
      if (!dbKey) {
        const lowerKey = csvKey.toLowerCase();
        const matchedHeader = Object.keys(reverseMapping).find((k) => k.toLowerCase() === lowerKey);
        if (matchedHeader) dbKey = reverseMapping[matchedHeader];
      }
      if (dbKey) {
        let val = normalizedRow[csvKey];
        if (["date", "dob", "joiningDate", "fromDate", "toDate", "dueDate", "expectedLastWorkingDay", "lastWorkingDay", "allocatedAt", "verifiedAt"].includes(dbKey)) {
          const parsedDate = parseImportDate(val);
          if (parsedDate) val = parsedDate;
        }
        newRow[dbKey] = val;
      }
    });

    try {
      if (moduleName === "Companies" || moduleName === "Company") {
        if (!newRow.name || !newRow.email) {
          isValid = false; rowError += "Name and Email are required. ";
        } else if (cache.emails.has(newRow.email.toLowerCase().trim())) {
          isValid = false; rowError += `Company Email '${newRow.email}' already exists. `;
        } else {
          const now = new Date();
          const year = now.getFullYear().toString().slice(-2);
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const prefix = `${year}${month}`;

          let lastBatchId = cache.companies.get("_lastGeneratedId");
          if (lastBatchId === undefined) {
            const lastCompany = await Company.findOne({ companyId: new RegExp(`^${prefix}`) }).sort({ companyId: -1 }).lean();
            lastBatchId = lastCompany?.companyId && lastCompany.companyId.startsWith(prefix)
              ? parseInt(lastCompany.companyId.slice(4))
              : 0;
          }
          const nextId = lastBatchId + 1;
          newRow.companyId = prefix + String(nextId).padStart(4, "0");
          cache.companies.set("_lastGeneratedId", nextId);
        }
      } else if (moduleName === "Branches") {
        const compVal = normalizedRow["Company"];
        const compId = resolveId(compVal, cache.companies);
        if (compId) newRow.companyId = compId;
        else { isValid = false; rowError += `Company '${compVal}' not found. `; }

        if (newRow.name && cache.branches.has(newRow.name.toLowerCase().trim())) {
          isValid = false; rowError += `Branch Name '${newRow.name}' already exists. `;
        }
      } else if (moduleName === "Departments") {
        const compVal = normalizedRow["Company"];
        const compId = resolveId(compVal, cache.companies);
        if (compId) newRow.companyId = compId;
        else { isValid = false; rowError += `Company '${compVal}' not found. `; }

        const branchVal = normalizedRow["Branch"];
        const branchId = resolveId(branchVal, cache.branches);
        if (branchId) newRow.branchId = branchId;
        else { isValid = false; rowError += `Branch '${branchVal}' not found. `; }

        if (newRow.name && cache.departments.has(newRow.name.toLowerCase().trim())) {
          isValid = false; rowError += `Department Name '${newRow.name}' already exists. `;
        }
      } else if (moduleName === "Designations") {
        const compVal = normalizedRow["Company"];
        const compId = resolveId(compVal, cache.companies);
        if (compId) newRow.companyId = compId;
        else { isValid = false; rowError += `Company '${compVal}' not found. `; }

        const depVal = normalizedRow["Department"];
        const depId = resolveId(depVal, cache.departments);
        if (depId) newRow.departmentId = depId;
        else { isValid = false; rowError += `Department '${depVal}' not found. `; }

        if (newRow.name && cache.designations.has(newRow.name.toLowerCase().trim())) {
          isValid = false; rowError += `Designation '${newRow.name}' already exists. `;
        }
      } else if (moduleName === "Roles") {
        if (newRow.name && cache.roles.has(newRow.name.toLowerCase().trim())) {
          isValid = false; rowError += `Role '${newRow.name}' already exists. `;
        }
      } else if (moduleName === "Holidays") {
        // Holiday.companyId is required, but the CSV has no Company column.
        // Mirror addHoliday: scope to the importing user's own company; only
        // fall back to a system-wide lookup when the account has none.
        if (actingUser && !actingUser.isSystemAdmin && actingUser.role !== ROLES.HRMSAdmin && actingUser.companyId) {
          newRow.companyId = actingUser.companyId;
        } else if (cache.companies.size === 1) {
          newRow.companyId = cache.companies.values().next().value;
        } else {
          isValid = false;
          rowError += "Could not determine the company for this holiday (multiple companies exist and your account isn't scoped to one). ";
        }

        if (!newRow.title || !newRow.date) {
          isValid = false; rowError += "Holiday Name and Date are required. ";
        } else {
          // Day of week is derived, not user-entered — recompute it so a
          // wrong/missing "Day" column can't desync from the actual date.
          const parsedDate = newRow.date instanceof Date ? newRow.date : new Date(newRow.date);
          if (!isNaN(parsedDate.getTime())) {
            newRow.day = parsedDate.toLocaleDateString("en-US", { weekday: "long" });
          } else {
            isValid = false; rowError += "Date is invalid. ";
          }
        }
      } else if (moduleName === "Employees") {
        if (newRow.employeeId && cache.employeeIds.has(newRow.employeeId.toLowerCase().trim())) {
          isValid = false; rowError += `Employee ID '${newRow.employeeId}' already exists. `;
        }
        if (newRow.email && cache.emails.has(newRow.email.toLowerCase().trim())) {
          isValid = false; rowError += `Email '${newRow.email}' already exists. `;
        }

        const compVal = normalizedRow["Company"];
        if (compVal) {
          const id = resolveId(compVal, cache.companies);
          if (id) newRow.companyId = id;
          else { isValid = false; rowError += `Company '${compVal}' not found. `; }
        } else if (cache.companies.size === 1) {
          newRow.companyId = cache.companies.values().next().value;
        }

        const branchVal = normalizedRow["Branch"];
        if (branchVal) {
          const id = resolveId(branchVal, cache.branches);
          if (id) newRow.branchId = id;
          else { isValid = false; rowError += `Branch '${branchVal}' not found. `; }
        }

        const depVal = normalizedRow["Department"];
        if (depVal) {
          const id = resolveId(depVal, cache.departments);
          if (id) newRow.departmentId = id;
          else { isValid = false; rowError += `Department '${depVal}' not found. `; }
        }

        const desigVal = normalizedRow["Designation"];
        if (desigVal) {
          const id = resolveId(desigVal, cache.designations);
          if (id) newRow.designationId = id;
          else { isValid = false; rowError += `Designation '${desigVal}' not found. `; }
        }

        const roleVal = newRow.role;
        if (roleVal && !cache.roles.has(roleVal.toLowerCase().trim())) {
          isValid = false; rowError += `Role '${roleVal}' not found in system roles. `;
        }

        const managerVal = normalizedRow["Reporting Manager"];
        if (managerVal) {
          try {
            const manager = await User.findOne({ email: managerVal.toLowerCase().trim() }).select("_id");
            newRow.managerId = manager?._id || null;
          } catch {
            newRow.managerId = null;
          }
        } else {
          newRow.managerId = null;
        }

        const ccVal = normalizedRow["Cost Center"];
        if (ccVal) {
          try {
            const query: any = { name: { $regex: new RegExp(`^${ccVal}$`, "i") } };
            if (newRow.companyId) query.companyId = newRow.companyId;
            const costCenter = await CostCenter.findOne(query).select("_id");
            newRow.costCenterId = costCenter?._id || null;
          } catch {
            newRow.costCenterId = null;
          }
        } else {
          newRow.costCenterId = null;
        }

        if (!newRow.email || !newRow.name) {
          isValid = false; rowError += "Name and Email are required. ";
        }
        if (!newRow.companyId || !newRow.branchId || !newRow.departmentId || !newRow.designationId) {
          isValid = false; rowError += "Company, Branch, Department, and Designation are required. ";
        }

        if (!newRow.employmentStatus) newRow.employmentStatus = "PROBATION";
        if (!newRow.status) newRow.status = "ACTIVE";
        // NOTE: password is hashed in bulk after validation (insertMany skips
        // Mongoose pre('save') hooks, so plaintext would otherwise be stored).
        if (!newRow.password) newRow.password = "Password@123";
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
            if (newRow.user) newRow.user = id;
            if (newRow.employee) newRow.employee = id;
            if (COMPANY_DERIVED_MODULES.has(moduleName)) {
              const companyId = cache.employeeCompany.get(String(id));
              if (companyId) newRow.companyId = companyId;
            }
          } else {
            isValid = false; rowError += `Employee ID '${empVal}' not found. `;
          }
        }
      }
    } catch (e) {
      console.error("Row validation error:", e);
      isValid = false;
      rowError += "Unexpected validation error. ";
    }

    if (isValid) validRows.push(newRow);
    else errors.push(rowError);
  }

  return { validRows, errors };
};

const resolveId = (nameOrId: string, map: Map<string, any>): any | null => {
  if (!nameOrId) return null;
  const clean = nameOrId.toString().toLowerCase().trim();
  if (mongoose.Types.ObjectId.isValid(nameOrId)) return nameOrId;
  return map.get(clean) || null;
};

const parseImportDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  const dateStr = value.toString().trim();

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(dateStr)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }

  const parts = dateStr.split(/[-/.]/);
  if (parts.length === 3) {
    let d, m, y;
    if (parts[0].length === 4) {
      y = parseInt(parts[0]); m = parseInt(parts[1]) - 1; d = parseInt(parts[2]);
    } else {
      d = parseInt(parts[0]); m = parseInt(parts[1]) - 1; y = parseInt(parts[2]);
      if (y < 100) y += 2000;
    }
    const dateObj = new Date(Date.UTC(y, m, d));
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  const generic = new Date(dateStr);
  if (!isNaN(generic.getTime())) return generic;
  return null;
};

export const importData = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = (req as any).file;
  try {
    if (!file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const { moduleName } = req.body;

    if (IMPORT_BLOCKED_MODULES.has(moduleName)) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({
        message: `'${moduleName}' is system-generated and cannot be bulk-imported.`,
      });
      return;
    }

    const Model = getModelByName(moduleName as string);
    const userId = req.user?.id;

    if (!Model) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({ message: "Invalid module name" });
      return;
    }

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const mapping = getColumnMapping(moduleName as string);

    let finalRows: any[] = [];
    let errors: string[] = [];

    if (mapping && rows.length > 0) {
      const result = await resolveAndValidateData(moduleName, rows, mapping as Record<string, string>, userId, req.user);
      finalRows = result.validRows;
      errors = result.errors;
    } else {
      finalRows = rows.map((row: any) => ({ ...row, createdBy: userId }));
    }

    if (moduleName === "Employees") {
      for (const row of finalRows) {
        if (row.password) row.password = await bcrypt.hash(row.password, 10);
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
          errors.push(
            `${finalRows.length - insertedCount} row(s) passed initial checks but were rejected while saving (likely missing/invalid required fields for this module).`
          );
        }
      } catch (dbError: any) {
        console.error("Database Import Error:", dbError);
        insertedCount = dbError.insertedDocs?.length || 0;
        if (dbError.writeErrors) {
          dbError.writeErrors.forEach((e: any) => errors.push(`DB Error Row: ${e.err?.errmsg || e.errmsg}`));
        } else {
          errors.push(`DB Error: ${dbError.message}`);
        }
      }
    }

    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);

    res.status(200).json({
      message: errors.length > 0 ? "Data imported with some errors" : "Data imported successfully",
      count: insertedCount,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Import Error:", error);
    if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ message: "Error importing data", error: error.message });
  }
};

export const hardDelete = async (req: AuthRequest, res: Response): Promise<void> => {
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
      const Model = getModelByName(moduleName as string);
      if (!Model) {
        errors.push(`Invalid module: ${moduleName}`);
        continue;
      }

      try {
        const deleteResult = await Model.deleteMany({});
        results.push({ module: moduleName, deletedCount: deleteResult.deletedCount });
      } catch (err: any) {
        console.error(`Error deleting ${moduleName}:`, err);
        errors.push(`Failed to delete ${moduleName}: ${err.message}`);
      }
    }

    res.status(200).json({
      message: "Bulk delete operation completed.",
      results,
      errors,
    });
  } catch (error: any) {
    console.error("Hard Delete Error:", error);
    res.status(500).json({ message: "Error deleting data", error: error.message });
  }
};
