"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveEmployeeBulk = exports.parseEmployeeBulk = void 0;
const xlsx_1 = __importDefault(require("xlsx"));
const User_1 = __importDefault(require("../../models/User"));
const Company_1 = __importDefault(require("../../models/hrms/Company"));
const Branch_1 = __importDefault(require("../../models/hrms/Branch"));
const Department_1 = __importDefault(require("../../models/hrms/Department"));
const Designation_1 = __importDefault(require("../../models/hrms/Designation"));
const Role_1 = __importDefault(require("../../models/Role"));
const CostCenter_1 = __importDefault(require("../../models/hrms/CostCenter"));
const userController_1 = require("../userController");
const parseDate = (dateVal) => {
    if (!dateVal)
        return null;
    if (dateVal instanceof Date)
        return isNaN(dateVal.getTime()) ? null : dateVal;
    const s = String(dateVal).trim();
    if (!s)
        return null;
    // Try standard parsing
    let d = new Date(s);
    if (!isNaN(d.getTime()))
        return d;
    // Try DD-MM-YYYY
    let match = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
        d = new Date(`${match[3]}-${match[2]}-${match[1]}`);
        if (!isNaN(d.getTime()))
            return d;
    }
    // Try DD/MM/YYYY
    match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        d = new Date(`${match[3]}-${match[2]}-${match[1]}`);
        if (!isNaN(d.getTime()))
            return d;
    }
    return null;
};
const parseEmployeeBulk = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }
        const workbook = xlsx_1.default.read(req.file.buffer, { type: "buffer", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const jsonData = xlsx_1.default.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        if (jsonData.length < 2) {
            return res.status(400).json({ success: false, message: "File must contain a header and at least one data row" });
        }
        const headers = jsonData[0].map(h => h.trim());
        const dataRows = jsonData.slice(1);
        const requiredHeaders = [
            "Employee ID", "Name", "Email", "Mobile", "Gender", "DOB",
            "Joining Date", "Role", "Company", "Branch", "Department",
            "Designation", "Employment Type"
        ];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            return res.status(400).json({ success: false, message: `Missing headers: ${missingHeaders.join(", ")}` });
        }
        const employees = [];
        const errors = [];
        // Fetch all relevant masters for faster validation
        const [allCompanies, allBranches, allDepts, allDesigs, allRoles, allCostCenters] = await Promise.all([
            Company_1.default.find({}, "name"),
            Branch_1.default.find({}, "name companyId"),
            Department_1.default.find({}, "name branchId"),
            Designation_1.default.find({}, "name departmentId"),
            Role_1.default.find({}, "name"),
            CostCenter_1.default.find({}, "name companyId branchId status"),
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
            User_1.default.find({}, "email employeeId"),
            User_1.default.find({}, "email name")
        ]);
        const emailsInDB = new Set(existingUsers.map(u => u.email.toLowerCase()));
        const empIdsInDB = new Set(existingUsers.map(u => { var _a; return (_a = u.employeeId) === null || _a === void 0 ? void 0 : _a.toLowerCase(); }));
        const managerEmailsInDB = new Map(allManagers.map(m => [m.email.toLowerCase(), m]));
        const emailsInFile = new Set();
        const empIdsInFile = new Set();
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowNum = i + 2;
            const getVal = (header) => {
                const idx = headers.indexOf(header);
                return idx !== -1 && row[idx] !== undefined && row[idx] !== null ? row[idx] : "";
            };
            const dobVal = getVal("DOB");
            const joiningVal = getVal("Joining Date");
            const parsedDob = parseDate(dobVal);
            const parsedJoining = parseDate(joiningVal);
            // Support both "Reporting Manager" and old "Manager Email" for backward compatibility
            const reportingManagerVal = String(getVal("Reporting Manager") || getVal("Manager Email")).toLowerCase().trim();
            const data = {
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
            const expectedAbbr = (0, userController_1.getCompanyAbbr)(company.name);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.parseEmployeeBulk = parseEmployeeBulk;
const saveEmployeeBulk = async (req, res) => {
    try {
        const { employees } = req.body;
        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({ success: false, message: "No data provided" });
        }
        const results = { success: 0, failed: 0, errors: [] };
        for (const emp of employees) {
            try {
                // Lookups
                const company = await Company_1.default.findOne({ name: { $regex: new RegExp(`^${emp.companyName}$`, "i") } });
                if (!company)
                    throw new Error(`Company not found: ${emp.companyName}`);
                const branch = await Branch_1.default.findOne({
                    companyId: company._id,
                    name: { $regex: new RegExp(`^${emp.branchName}$`, "i") }
                });
                if (!branch)
                    throw new Error(`Branch not found: ${emp.branchName}`);
                const department = await Department_1.default.findOne({
                    branchId: branch._id,
                    name: { $regex: new RegExp(`^${emp.departmentName}$`, "i") }
                });
                if (!department)
                    throw new Error(`Department not found: ${emp.departmentName}`);
                const designation = await Designation_1.default.findOne({
                    departmentId: department._id,
                    name: { $regex: new RegExp(`^${emp.designationName}$`, "i") }
                });
                if (!designation)
                    throw new Error(`Designation not found: ${emp.designationName}`);
                let managerId = null;
                if (emp.reportingManager) {
                    const manager = await User_1.default.findOne({ email: emp.reportingManager.toLowerCase() });
                    managerId = (manager === null || manager === void 0 ? void 0 : manager._id) || null;
                }
                // Resolve Cost Center
                let costCenterId = null;
                if (emp.costCenterName) {
                    const costCenter = await CostCenter_1.default.findOne({
                        companyId: company._id,
                        branchId: branch._id,
                        name: { $regex: new RegExp(`^${emp.costCenterName}$`, "i") },
                    });
                    costCenterId = (costCenter === null || costCenter === void 0 ? void 0 : costCenter._id) || null;
                }
                const roleEntry = await Role_1.default.findOne({ name: { $regex: new RegExp(`^${emp.role}$`, "i") } });
                const finalRole = roleEntry ? roleEntry.name : emp.role.toLowerCase().replace(/\s+/g, "");
                // Probation logic (default 6 months)
                const joining = new Date(emp.joiningDate);
                const probationEndDate = new Date(joining);
                probationEndDate.setMonth(probationEndDate.getMonth() + 6);
                await User_1.default.create({
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
                results.success++;
            }
            catch (err) {
                results.failed++;
                results.errors.push(`Row ${emp.row}: ${err.message}`);
            }
        }
        res.json({ success: true, message: "Bulk upload completed", results });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.saveEmployeeBulk = saveEmployeeBulk;
