"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBranch = exports.updateBranch = exports.getBranchById = exports.getAllBranches = exports.createBranch = void 0;
const Branch_1 = __importDefault(require("../../models/hrms/Branch"));
const constants_1 = require("../../constants");
/**
 * CREATE BRANCH
 */
const createBranch = async (req, res) => {
    try {
        const branch = await Branch_1.default.create({
            ...req.body,
            companyId: (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId,
            createdBy: req.user.id,
        });
        res.status(201).json(branch);
    }
    catch (error) {
        res.status(400).json({
            message: "Failed to create branch",
            error: error.message,
        });
    }
};
exports.createBranch = createBranch;
/**
 * GET ALL BRANCHES
 */
const getAllBranches = async (req, res) => {
    try {
        let query = {};
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            query = { companyId: req.user.companyId };
        }
        const branches = await Branch_1.default.find(query)
            .populate("companyId", "name")
            .sort({ createdAt: -1 });
        const formatted = branches.map((b) => {
            var _a;
            return ({
                ...b.toObject(),
                companyName: (_a = b.companyId) === null || _a === void 0 ? void 0 : _a.name,
            });
        });
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch branches",
            error: error.message,
        });
    }
};
exports.getAllBranches = getAllBranches;
/**
 * GET BRANCH BY ID
 */
const getBranchById = async (req, res) => {
    try {
        const branch = await Branch_1.default.findById(req.params.id).populate("companyId", "name");
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }
        res.json(branch);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch branch",
            error: error.message,
        });
    }
};
exports.getBranchById = getBranchById;
/**
 * UPDATE BRANCH
 */
const updateBranch = async (req, res) => {
    try {
        const branch = await Branch_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }
        res.json(branch);
    }
    catch (error) {
        res.status(400).json({
            message: "Failed to update branch",
            error: error.message,
        });
    }
};
exports.updateBranch = updateBranch;
/**
 * DELETE BRANCH
 */
const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch_1.default.findByIdAndDelete(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }
        res.json({ message: "Branch deleted successfully" });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to delete branch",
            error: error.message,
        });
    }
};
exports.deleteBranch = deleteBranch;
