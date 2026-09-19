"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.getDepartmentById = exports.getDepartments = exports.createDepartment = void 0;
const Department_1 = __importDefault(require("../../models/hrms/Department"));
const constants_1 = require("../../constants");
/* CREATE */
const createDepartment = async (req, res) => {
    try {
        const departmentData = {
            ...req.body,
            companyId: (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId,
        };
        const department = await Department_1.default.create(departmentData);
        res.status(201).json(department);
    }
    catch (error) {
        res.status(400).json({
            message: "Failed to create department",
            error: error.message,
        });
    }
};
exports.createDepartment = createDepartment;
/* GET ALL */
const getDepartments = async (req, res) => {
    let query = {};
    if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
        query.companyId = req.user.companyId;
    }
    else if (req.query.companyId) {
        query.companyId = req.query.companyId;
    }
    const departments = await Department_1.default.find(query)
        .populate("companyId", "name")
        .populate("branchId", "name")
        .populate("headEmployeeId", "name email");
    res.json(departments);
};
exports.getDepartments = getDepartments;
/* GET BY ID */
const getDepartmentById = async (req, res) => {
    var _a, _b;
    const department = await Department_1.default.findById(req.params.id)
        .populate("companyId", "name")
        .populate("branchId", "name")
        .populate("headEmployeeId", "name email");
    if (!department) {
        return res.status(404).json({ message: "Department not found" });
    }
    if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = department.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
        return res.status(403).json({ message: "Access denied." });
    }
    res.json(department);
};
exports.getDepartmentById = getDepartmentById;
/* UPDATE */
const updateDepartment = async (req, res) => {
    var _a, _b;
    const department = await Department_1.default.findById(req.params.id);
    if (!department) {
        return res.status(404).json({ message: "Department not found" });
    }
    if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = department.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
        return res.status(403).json({ message: "Access denied." });
    }
    const updated = await Department_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
};
exports.updateDepartment = updateDepartment;
/* DELETE */
const deleteDepartment = async (req, res) => {
    var _a, _b;
    const department = await Department_1.default.findById(req.params.id);
    if (!department) {
        return res.status(404).json({ message: "Department not found" });
    }
    if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = department.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
        return res.status(403).json({ message: "Access denied." });
    }
    await Department_1.default.findByIdAndDelete(req.params.id);
    res.json({ message: "Department deleted" });
};
exports.deleteDepartment = deleteDepartment;
