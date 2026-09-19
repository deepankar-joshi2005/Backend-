/** @format */

import { Request, Response } from "express";
import xlsx from "xlsx";
import User from "../../models/User";
import Company from "../../models/hrms/Company";
import Branch from "../../models/hrms/Branch";
import Department from "../../models/hrms/Department";
import Designation from "../../models/hrms/Designation";
import Role from "../../models/Role";
import CostCenter from "../../models/hrms/CostCenter";
import mongoose from "mongoose";
import { getCompanyAbbr } from "../userController";
import { getEmployeeLimitStatus, employeeLimitErrorMessage } from "../../utils/enforceEmployeeLimit";

interface BulkEmployeeData {
    employeeId: string;
    name: string;
    email: string;
    mobile: string;
    gender: string;
    dob: string;
    joiningDate: string;
    role: string;
    companyName: string;
    branchName: string;
    departmentName: string;
    designationName: string;
    reportingManager?: string; // reporting manager email
    employmentType: string;
    costCenterName?: string;
    row: number;
}

const parseDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;

    const s = String(dateVal).trim();
    if (!s) return null;

    // Try standard parsing
    let d = new Date(s);
    if (!isNaN(d.getTime())) return d;

    // Try DD-MM-YYYY
    let match = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
        d = new Date(`${match[3]}-${match[2]}-${match[1]}`);
        if (!isNaN(d.getTime())) return d;
    }

    // Try DD/MM/YYYY
    match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        d = new Date(`${match[3]}-${match[2]}-${match[1]}`);
        if (!isNaN(d.getTime())) return d;
    }

    return null;
};

export const parseEmployeeBulk = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        if (jsonData.length < 2) {
            return res.status(400).json({ success: false, message: "File must contain a header and at least one data row" });
        }

        const headers = (jsonData[0] as string[]).map(h => h.trim());
        const dataRows = jsonData.slice(1) as any[][];

        const requiredHeaders = [
            "Employee ID", "Name", "Email", "Mobile", "Gender", "DOB",
            "Joining Date", "Role", "Company", "Branch", "Department",
            "Designation", "Employment Type"
        ];

        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            return res.status(400).json({ success: false, message: `Missing headers: ${missingHeaders.join(", ")}` });
        }

        const employees: BulkEmployeeData[] = [];
        const errors: string[] = [];

        // Fetch all relevant masters for faster validation
        const [allCompanies, allBranches, allDepts, allDesigs, allRoles, allCostCenters] = await Promise.all([
            Company.find({}, "name"),
            Branch.find({}, "name companyId"),
            Department.find({}, "name branchId"),
            Designation.find({}, "name departmentId"),
            Role.find({}, "name"),
            CostCenter.find({}, "name companyId branchId status"),
        ]);

        const compMap = new Map(allCompanies.map(c => [c.name.toLowerCase(), c]));
        const branchMap = new Map(allBranches.map(b => [`${b.companyId}_${b.name.toLowerCase()}`, b]));
        const deptMap = new Map(allDepts.map(d => [`${d.branchId}_${d.name.toLowerCase()}`, d]));
        const desigMap = new Map(allDesigs.map(d => [`${d.departmentId}_${d.name.toLowerCase()}`, d]));
        const roleSet = new Set(allRoles.map(r => r.name.toLowerCase()));
        // Cost center map: companyId_branchId_name
        const costCenterMap = new Map(allCostCenters.map(cc => [`${cc.companyId}_${cc.branchId}_${cc.name.toLowerCase()}`, cc]));

        // Prelim lookups for users
        const [existingUsers, allManagers] = await Promise.all([
            User.find({}, "email employeeId"),
            User.find({}, "email name")
        ]);

        const emailsInDB = new Set(existingUsers.map(u => u.email.toLowerCase()));
        const empIdsInDB = new Set(existingUsers.map(u => u.employeeId?.toLowerCase()));
        const managerEmailsInDB = new Map(allManagers.map(m => [m.email.toLowerCase(), m]));

        const emailsInFile = new Set<string>();
        const empIdsInFile = new Set<string>();

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowNum = i + 2;

            const getVal = (header: string) => {
                const idx = headers.indexOf(header);
                return idx !== -1 && row[idx] !== undefined && row[idx] !== null ? row[idx] : "";
            };

            const dobVal = getVal("DOB");
            const joiningVal = getVal("Joining Date");

            const parsedDob = parseDate(dobVal);
            const parsedJoining = parseDate(joiningVal);

            // Support both "Reporting Manager" and old "Manager Email" for backward compatibility
            const reportingManagerVal = String(
                getVal("Reporting Manager") || getVal("Manager Email")
            ).toLowerCase().trim();

            const data: BulkEmployeeData = {
                employeeId: String(getVal("Employee ID")).trim(),
                name: String(getVal("Name")).trim(),
                email: String(getVal("Email")).toLowerCase().trim(),
                mobile: String(getVal("Mobile")).trim(),
                gender: String(getVal("Gender")).trim(),
                dob: parsedDob ? parsedDob.toISOString() : "Invalid Date",
                joiningDate: parsedJoining ? parsedJoining.toISOString() : "Invalid Date",
                role: String(getVal("Role")).trim(),
                companyName: String(getVal("Company")).trim(),
                branchName: String(getVal("Branch")).trim(),
                departmentName: String(getVal("Department")).trim(),
                designationName: String(getVal("Designation")).trim(),
                reportingManager: reportingManagerVal || undefined,
                employmentType: String(getVal("Employment Type")).trim(),
                costCenterName: String(getVal("Cost Center")).trim() || undefined,
                row: rowNum,
            };

            // Basic Validation
            if (!data.employeeId || !data.name || !data.email || !data.role || !data.companyName) {
                errors.push(`Row ${rowNum}: Missing required fields`);
                continue;
            }

            if (data.dob === "Invalid Date") {
                errors.push(`Row ${rowNum}: Invalid DOB format (${dobVal}). Use YYYY-MM-DD or DD-MM-YYYY`);
                continue;
            }
            if (data.joiningDate === "Invalid Date") {
                errors.push(`Row ${rowNum}: Invalid Joining Date format (${joiningVal}). Use YYYY-MM-DD or DD-MM-YYYY`);
                continue;
            }

            if (emailsInDB.has(data.email) || emailsInFile.has(data.email)) {
                errors.push(`Row ${rowNum}: Duplicate Email (${data.email})`);
                continue;
            }
            if (empIdsInDB.has(data.employeeId.toLowerCase()) || empIdsInFile.has(data.employeeId.toLowerCase())) {
                errors.push(`Row ${rowNum}: Duplicate Employee ID (${data.employeeId})`);
                continue;
            }

            // Existence Checks & Prefix Validation
            const company = compMap.get(data.companyName.toLowerCase());
            if (!company) {
                errors.push(`Row ${rowNum}: Company "${data.companyName}" not found`);
                continue;
            }

            // Prefix Validation (EMP-XXX-) based on company
            const expectedAbbr = getCompanyAbbr(company.name);
            const expectedPrefix = `EMP-${expectedAbbr}-`;
            if (!data.employeeId.toUpperCase().startsWith(expectedPrefix)) {
                errors.push(`Row ${rowNum}: Employee ID "${data.employeeId}" must start with "${expectedPrefix}" for company "${company.name}"`);
                continue;
            }

            // Reporting Manager Validation
            if (data.reportingManager) {
                if (!managerEmailsInDB.has(data.reportingManager)) {
                    errors.push(`Row ${rowNum}: Reporting Manager email "${data.reportingManager}" not found in the system`);
                    continue;
                }
            }

            const branch = branchMap.get(`${company._id}_${data.branchName.toLowerCase()}`);
            if (!branch) {
                errors.push(`Row ${rowNum}: Branch "${data.branchName}" not found in company "${data.companyName}"`);
                continue;
            }

            const dept = deptMap.get(`${branch._id}_${data.departmentName.toLowerCase()}`);
            if (!dept) {
                errors.push(`Row ${rowNum}: Department "${data.departmentName}" not found in branch "${data.branchName}"`);
                continue;
            }

            const desig = desigMap.get(`${dept._id}_${data.designationName.toLowerCase()}`);
            if (!desig) {
                errors.push(`Row ${rowNum}: Designation "${data.designationName}" not found in department "${data.departmentName}"`);
                continue;
            }

            if (!roleSet.has(data.role.toLowerCase().replace(/\s+/g, ""))) {
                // If direct normalization doesn't match, check if database name matches
                let foundRole = false;
                for (const r of allRoles) {
                    if (r.name.toLowerCase() === data.role.toLowerCase()) {
                        foundRole = true;
                        break;
                    }
                }
                if (!foundRole) {
                    errors.push(`Row ${rowNum}: Role "${data.role}" not found`);
                    continue;
                }
            }

            // Cost Center Validation (optional)
            if (data.costCenterName) {
                const ccKey = `${company._id}_${branch._id}_${data.costCenterName.toLowerCase()}`;
                const costCenter = costCenterMap.get(ccKey);
                if (!costCenter) {
                    errors.push(`Row ${rowNum}: Cost Center "${data.costCenterName}" not found for company "${data.companyName}" and branch "${data.branchName}"`);
                    continue;
                }
            }

            emailsInFile.add(data.email);
            empIdsInFile.add(data.employeeId.toLowerCase());
            employees.push(data);
        }

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: "Validation errors", errors });
        }

        res.json({ success: true, data: employees, total: employees.length });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const saveEmployeeBulk = async (req: Request, res: Response) => {
    try {
        const { employees } = req.body;
        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({ success: false, message: "No data provided" });
        }

        const results = { success: 0, failed: 0, errors: [] as string[] };
        // Per-company running count so a single batch can't blow past the plan's
        // employee limit either — checked/incremented as we go, not just per-row.
        const limitCache = new Map<string, { limit: number; current: number; planTier?: string } | null>();

        for (const emp of employees as BulkEmployeeData[]) {
            try {
                // Lookups
                const company = await Company.findOne({ name: { $regex: new RegExp(`^${emp.companyName}$`, "i") } });
                if (!company) throw new Error(`Company not found: ${emp.companyName}`);

                const companyIdStr = String(company._id);
                if (!limitCache.has(companyIdStr)) {
                    const status = await getEmployeeLimitStatus(companyIdStr);
                    limitCache.set(
                        companyIdStr,
                        status.limited ? { limit: status.limit, current: status.current, planTier: status.planTier } : null
                    );
                }
                const limitInfo = limitCache.get(companyIdStr);
                if (limitInfo && limitInfo.current >= limitInfo.limit) {
                    throw new Error(`${emp.companyName}: ${employeeLimitErrorMessage(limitInfo.planTier, limitInfo.limit)}`);
                }

                const branch = await Branch.findOne({
                    companyId: company._id,
                    name: { $regex: new RegExp(`^${emp.branchName}$`, "i") }
                });
                if (!branch) throw new Error(`Branch not found: ${emp.branchName}`);

                const department = await Department.findOne({
                    branchId: branch._id,
                    name: { $regex: new RegExp(`^${emp.departmentName}$`, "i") }
                });
                if (!department) throw new Error(`Department not found: ${emp.departmentName}`);

                const designation = await Designation.findOne({
                    departmentId: department._id,
                    name: { $regex: new RegExp(`^${emp.designationName}$`, "i") }
                });
                if (!designation) throw new Error(`Designation not found: ${emp.designationName}`);

                let managerId = null;
                if (emp.reportingManager) {
                    const manager = await User.findOne({ email: emp.reportingManager.toLowerCase() });
                    managerId = manager?._id || null;
                }

                // Resolve Cost Center
                let costCenterId = null;
                if (emp.costCenterName) {
                    const costCenter = await CostCenter.findOne({
                        companyId: company._id,
                        branchId: branch._id,
                        name: { $regex: new RegExp(`^${emp.costCenterName}$`, "i") },
                    });
                    costCenterId = costCenter?._id || null;
                }

                const roleEntry = await Role.findOne({ name: { $regex: new RegExp(`^${emp.role}$`, "i") } });
                const finalRole = roleEntry ? roleEntry.name : emp.role.toLowerCase().replace(/\s+/g, "");

                // Probation logic (default 6 months)
                const joining = new Date(emp.joiningDate);
                const probationEndDate = new Date(joining);
                probationEndDate.setMonth(probationEndDate.getMonth() + 6);

                await User.create({
                    employeeId: emp.employeeId,
                    name: emp.name,
                    email: emp.email,
                    mobile: emp.mobile,
                    gender: emp.gender,
                    dob: new Date(emp.dob),
                    joiningDate: joining,
                    role: finalRole,
                    companyId: company._id,
                    branchId: branch._id,
                    departmentId: department._id,
                    designationId: designation._id,
                    managerId,
                    costCenterId,
                    employmentType: emp.employmentType || "Full-Time",
                    employmentStatus: "PROBATION",
                    probationEndDate,
                    status: "ACTIVE",
                    password: "Password@123", // Default password for bulk
                });

                if (limitInfo) limitInfo.current++;
                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push(`Row ${emp.row}: ${err.message}`);
            }
        }

        res.json({ success: true, message: "Bulk upload completed", results });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};