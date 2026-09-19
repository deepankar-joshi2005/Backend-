"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDesignation = exports.updateDesignation = exports.getDesignationById = exports.getDesignations = exports.createDesignation = void 0;
const Designation_1 = __importDefault(require("../../models/hrms/Designation"));
const constants_1 = require("../../constants");
const createDesignation = async (req, res) => {
    try {
        const designation = await Designation_1.default.create({
            ...req.body,
            companyId: (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId,
        });
        res.status(201).json(designation);
    }
    catch (err) {
        res.status(400).json({ message: "Create failed", error: err.message });
    }
};
exports.createDesignation = createDesignation;
const getDesignations = async (req, res) => {
    const { companyId, departmentId } = req.query;
    const filter = {};
    if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
        filter.companyId = req.user.companyId;
    }
    else if (companyId) {
        filter.companyId = companyId;
    }
    if (departmentId)
        filter.departmentId = departmentId;
    const data = await Designation_1.default.find(filter)
        .populate("companyId", "name")
        .populate("departmentId", "name")
        .sort({ createdAt: -1 });
    res.json(data);
};
exports.getDesignations = getDesignations;
const getDesignationById = async (req, res) => {
    const data = await Designation_1.default.findById(req.params.id)
        .populate("companyId", "name")
        .populate("departmentId", "name");
    res.json(data);
};
exports.getDesignationById = getDesignationById;
const updateDesignation = async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.departmentId === "") {
            data.departmentId = null;
        }
        const updated = await Designation_1.default.findByIdAndUpdate(req.params.id, data, {
            new: true,
        });
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ message: "Update failed", error: err.message });
    }
};
exports.updateDesignation = updateDesignation;
const deleteDesignation = async (req, res) => {
    await Designation_1.default.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
};
exports.deleteDesignation = deleteDesignation;
