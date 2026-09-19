"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSalaryStructureById = exports.updateSalaryStructure = exports.getSalaryStructureById = exports.getAllSalaryStructures = exports.addSalaryStructure = void 0;
const SalaryStructure_1 = __importDefault(require("../../models/hrms/SalaryStructure"));
const User_1 = __importDefault(require("../../models/User"));
const constants_1 = require("../../constants");
/**
 * ➕ Add Salary Structure
 */
const addSalaryStructure = async (req, res) => {
    var _a;
    try {
        const { employee, basic, hra, otherAllowance, pf, professionalTax, tds, advance, others } = req.body;
        if (!employee) {
            return res.status(400).json({ message: "Employee is required" });
        }
        const { companyId, role } = req.user;
        // Verify target employee belongs to same company
        const targetUser = await User_1.default.findById(employee);
        if (!targetUser)
            return res.status(404).json({ message: "Employee not found" });
        if (role !== constants_1.ROLES.HRMSAdmin && ((_a = targetUser.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== (companyId === null || companyId === void 0 ? void 0 : companyId.toString())) {
            return res.status(403).json({ message: "Access denied. Employee belongs to another company." });
        }
        // check duplicate
        const exists = await SalaryStructure_1.default.findOne({
            employee,
            ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
        });
        if (exists) {
            return res.status(400).json({
                message: "Salary structure already exists for this employee",
            });
        }
        const salary = await SalaryStructure_1.default.create({
            employee,
            basic,
            hra,
            otherAllowance,
            pf,
            professionalTax,
            tds,
            advance,
            others,
            companyId: companyId, // Set companyId
        });
        res.status(201).json({
            message: "Salary structure added successfully",
            salary,
        });
    }
    catch (error) {
        console.error("Add salary error:", error);
        res.status(500).json({
            message: "Failed to add salary structure",
            error: error.message,
        });
    }
};
exports.addSalaryStructure = addSalaryStructure;
/**
 * 📋 Get All Salary Structures
 */
const getAllSalaryStructures = async (req, res) => {
    try {
        const { companyId: qCompanyId } = req.query;
        const { companyId: uCompanyId, role } = req.user;
        let filter = {};
        if (role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = uCompanyId;
        }
        else if (qCompanyId) {
            filter.companyId = qCompanyId;
        }
        const salaryList = await SalaryStructure_1.default.find(filter)
            .populate({
            path: "employee",
            populate: [
                { path: "designationId" },
                { path: "departmentId" },
                { path: "branchId" }
            ]
        })
            .sort({ createdAt: -1 });
        res.json(salaryList);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch salary structures",
            error: error.message,
        });
    }
};
exports.getAllSalaryStructures = getAllSalaryStructures;
/**
 * 🔍 Get Salary Structure By ID (Employee ID)
 */
const getSalaryStructureById = async (req, res) => {
    try {
        const { companyId, role } = req.user;
        const salary = await SalaryStructure_1.default.findOne({
            employee: req.params.id,
            ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
        }).populate({
            path: "employee",
            populate: [
                { path: "designationId" },
                { path: "departmentId" },
                { path: "branchId" }
            ]
        });
        if (!salary) {
            return res.status(404).json({ message: "Salary structure not found" });
        }
        res.json(salary);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch salary structure",
            error: error.message,
        });
    }
};
exports.getSalaryStructureById = getSalaryStructureById;
/**
 * ✏️ Update Salary Structure
 */
const updateSalaryStructure = async (req, res) => {
    var _a;
    try {
        const { basic, hra, otherAllowance, pf, professionalTax, tds, advance, others } = req.body;
        const { companyId, role } = req.user;
        const existingSalary = await SalaryStructure_1.default.findById(req.params.id);
        if (!existingSalary)
            return res.status(404).json({ message: "Salary structure not found" });
        // Access check
        if (role !== constants_1.ROLES.HRMSAdmin && ((_a = existingSalary.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== (companyId === null || companyId === void 0 ? void 0 : companyId.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        const updateData = {};
        if (basic != null)
            updateData.basic = basic;
        if (hra != null)
            updateData.hra = hra;
        if (otherAllowance != null)
            updateData.otherAllowance = otherAllowance;
        if (pf != null)
            updateData.pf = pf;
        if (professionalTax != null)
            updateData.professionalTax = professionalTax;
        if (tds != null)
            updateData.tds = tds;
        if (advance != null)
            updateData.advance = advance;
        if (others != null)
            updateData.others = others;
        const salary = await SalaryStructure_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate({
            path: "employee",
            select: "name employeeId joiningDate designationId departmentId branchId",
            populate: [
                { path: "designationId", select: "name" },
                { path: "departmentId", select: "name" },
                { path: "branchId", select: "name" }
            ]
        });
        res.json({
            message: "Salary structure updated successfully",
            salary,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update salary structure",
            error: error.message,
        });
    }
};
exports.updateSalaryStructure = updateSalaryStructure;
/**
 * 🗑️ Delete Salary Structure
 */
const deleteSalaryStructureById = async (req, res) => {
    var _a;
    try {
        const { companyId, role } = req.user;
        const existingSalary = await SalaryStructure_1.default.findById(req.params.id);
        if (!existingSalary)
            return res.status(404).json({ message: "Salary structure not found" });
        // Access check
        if (role !== constants_1.ROLES.HRMSAdmin && ((_a = existingSalary.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== (companyId === null || companyId === void 0 ? void 0 : companyId.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        await SalaryStructure_1.default.findByIdAndDelete(req.params.id);
        res.json({
            message: "Salary structure deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to delete salary structure",
            error: error.message,
        });
    }
};
exports.deleteSalaryStructureById = deleteSalaryStructureById;
