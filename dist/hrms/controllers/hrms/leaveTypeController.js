"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLeaveTypeById = exports.updateLeaveType = exports.getLeaveTypeById = exports.getAllLeaveTypes = exports.addLeaveType = void 0;
const LeaveType_1 = __importDefault(require("../../models/hrms/LeaveType"));
/**
 * ➕ Add Leave Type
 */
const addLeaveType = async (req, res) => {
    console.log("🔥 APPLY LEAVE TYPE CONTROLLER HIT 🔥");
    try {
        const { name, code, maxDays, paid, carryForward } = req.body;
        if (!name || !code || maxDays === undefined) {
            return res.status(400).json({
                message: "Name, code and max days are required",
            });
        }
        const existing = await LeaveType_1.default.findOne({ code });
        if (existing) {
            return res.status(400).json({
                message: "Leave type with this code already exists",
            });
        }
        const leaveType = await LeaveType_1.default.create({
            name,
            code,
            maxDays,
            paid,
            carryForward,
        });
        res.status(201).json({
            message: "Leave type added successfully",
            leaveType,
        });
    }
    catch (error) {
        console.error("Add leave type error:", error);
        res.status(500).json({
            message: "Failed to add leave type",
            error: error.message,
        });
    }
};
exports.addLeaveType = addLeaveType;
/**
 * 📋 Get All Leave Types
 */
const getAllLeaveTypes = async (_req, res) => {
    try {
        const leaveTypes = await LeaveType_1.default.find().sort({ createdAt: -1 });
        res.json(leaveTypes);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch leave types",
            error: error.message,
        });
    }
};
exports.getAllLeaveTypes = getAllLeaveTypes;
/**
 * 🔍 Get Leave Type By ID
 */
const getLeaveTypeById = async (req, res) => {
    try {
        const leaveType = await LeaveType_1.default.findById(req.params.id);
        if (!leaveType) {
            return res.status(404).json({
                message: "Leave type not found",
            });
        }
        res.json(leaveType);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch leave type",
            error: error.message,
        });
    }
};
exports.getLeaveTypeById = getLeaveTypeById;
/**
 * ✏️ Update Leave Type
 */
const updateLeaveType = async (req, res) => {
    try {
        const { name, code, maxDays, paid, carryForward } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (code)
            updateData.code = code;
        if (maxDays !== undefined)
            updateData.maxDays = maxDays;
        if (paid !== undefined)
            updateData.paid = paid;
        if (carryForward !== undefined)
            updateData.carryForward = carryForward;
        const leaveType = await LeaveType_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!leaveType) {
            return res.status(404).json({
                message: "Leave type not found",
            });
        }
        res.json({
            message: "Leave type updated successfully",
            leaveType,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update leave type",
            error: error.message,
        });
    }
};
exports.updateLeaveType = updateLeaveType;
/**
 * 🗑️ Delete Leave Type
 */
const deleteLeaveTypeById = async (req, res) => {
    try {
        const leaveType = await LeaveType_1.default.findByIdAndDelete(req.params.id);
        if (!leaveType) {
            return res.status(404).json({
                message: "Leave type not found",
            });
        }
        res.json({
            message: "Leave type deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to delete leave type",
            error: error.message,
        });
    }
};
exports.deleteLeaveTypeById = deleteLeaveTypeById;
