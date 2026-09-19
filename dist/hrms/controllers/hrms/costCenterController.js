"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCostCenter = exports.updateCostCenter = exports.getCostCenterById = exports.getCostCenters = exports.createCostCenter = void 0;
const CostCenter_1 = __importDefault(require("../../models/hrms/CostCenter"));
const constants_1 = require("../../constants");
/**
 * ➕ CREATE COST CENTER
 */
const createCostCenter = async (req, res) => {
    try {
        if (req.body.departmentId === "" || req.body.departmentId === null) {
            delete req.body.departmentId;
        }
        const { code } = req.body;
        const existing = await CostCenter_1.default.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ message: "Cost Center code already exists" });
        }
        const costCenterData = {
            ...req.body,
            companyId: (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId,
        };
        const costCenter = await CostCenter_1.default.create(costCenterData);
        res.status(201).json({
            message: "Cost Center created successfully",
            costCenter,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to create cost center",
            error: error.message,
        });
    }
};
exports.createCostCenter = createCostCenter;
/**
 * 📋 GET ALL COST CENTERS (supports filtering by companyId, branchId, status)
 */
const getCostCenters = async (req, res) => {
    try {
        const { companyId, branchId, departmentId, status } = req.query;
        const filter = {};
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        else if (companyId) {
            filter.companyId = companyId;
        }
        if (branchId)
            filter.branchId = branchId;
        if (departmentId)
            filter.departmentId = departmentId;
        if (status)
            filter.status = status;
        const costCenters = await CostCenter_1.default.find(filter)
            .populate("companyId", "name")
            .populate("branchId", "name")
            .populate("departmentId", "name")
            .sort({ createdAt: -1 });
        res.json(costCenters);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch cost centers",
            error: error.message,
        });
    }
};
exports.getCostCenters = getCostCenters;
/**
 * 🔍 GET COST CENTER BY ID
 */
const getCostCenterById = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const costCenter = await CostCenter_1.default.findById(req.params.id)
            .populate("companyId", "name")
            .populate("branchId", "name")
            .populate("departmentId", "name");
        if (!costCenter) {
            return res.status(404).json({ message: "Cost Center not found" });
        }
        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_b = (_a = costCenter.companyId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) !== ((_c = req.user.companyId) === null || _c === void 0 ? void 0 : _c.toString())) {
            // Check both populated and unpopulated just in case
            const companyIdStr = ((_e = (_d = costCenter.companyId) === null || _d === void 0 ? void 0 : _d._id) === null || _e === void 0 ? void 0 : _e.toString()) || ((_f = costCenter.companyId) === null || _f === void 0 ? void 0 : _f.toString());
            if (companyIdStr !== ((_g = req.user.companyId) === null || _g === void 0 ? void 0 : _g.toString())) {
                return res.status(403).json({ message: "Access denied." });
            }
        }
        res.json(costCenter);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch cost center",
            error: error.message,
        });
    }
};
exports.getCostCenterById = getCostCenterById;
/**
 * ✏️ UPDATE COST CENTER
 */
const updateCostCenter = async (req, res) => {
    var _a, _b;
    try {
        const existingCC = await CostCenter_1.default.findById(req.params.id);
        if (!existingCC) {
            return res.status(404).json({ message: "Cost Center not found" });
        }
        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = existingCC.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        if (req.body.departmentId === "" || req.body.departmentId === null) {
            delete req.body.departmentId;
        }
        const costCenter = await CostCenter_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({
            message: "Cost Center updated successfully",
            costCenter,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update cost center",
            error: error.message,
        });
    }
};
exports.updateCostCenter = updateCostCenter;
/**
 * 🗑️ DELETE COST CENTER
 */
const deleteCostCenter = async (req, res) => {
    var _a, _b;
    try {
        const existingCC = await CostCenter_1.default.findById(req.params.id);
        if (!existingCC) {
            return res.status(404).json({ message: "Cost Center not found" });
        }
        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = existingCC.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        await CostCenter_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Cost Center deleted successfully" });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to delete cost center",
            error: error.message,
        });
    }
};
exports.deleteCostCenter = deleteCostCenter;
