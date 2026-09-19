"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAssignment = exports.vacateAssignment = exports.updateAssignment = exports.getAllAssignments = exports.allocateLocker = void 0;
const LockerAssignment_1 = __importDefault(require("../../models/hrms/LockerAssignment"));
/* ================= CREATE / ALLOCATE ================= */
const allocateLocker = async (req, res) => {
    try {
        const { employee, type, code, location, floor } = req.body;
        if (!employee || !type || !code || !location || !floor) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }
        const existing = await LockerAssignment_1.default.findOne({ code });
        if (existing) {
            return res.status(409).json({
                message: "Locker / Cabin already allocated",
            });
        }
        const assignment = await LockerAssignment_1.default.create({
            employee,
            type,
            code,
            location,
            floor,
            status: "ALLOCATED",
        });
        res.status(201).json({
            message: "Locker/Cabin allocated successfully",
            data: assignment,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to allocate locker/cabin",
            error,
        });
    }
};
exports.allocateLocker = allocateLocker;
/* ================= GET ALL ================= */
const getAllAssignments = async (_, res) => {
    try {
        const data = await LockerAssignment_1.default.find()
            .populate("employee", "name role employeeCode")
            .sort({ createdAt: -1 });
        res.json(data);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch assignments",
            error,
        });
    }
};
exports.getAllAssignments = getAllAssignments;
/* ================= UPDATE ================= */
const updateAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, code, location, floor } = req.body;
        const assignment = await LockerAssignment_1.default.findById(id);
        if (!assignment) {
            return res.status(404).json({
                message: "Assignment not found",
            });
        }
        assignment.type = type !== null && type !== void 0 ? type : assignment.type;
        assignment.code = code !== null && code !== void 0 ? code : assignment.code;
        assignment.location = location !== null && location !== void 0 ? location : assignment.location;
        assignment.floor = floor !== null && floor !== void 0 ? floor : assignment.floor;
        await assignment.save();
        res.json({
            message: "Assignment updated successfully",
            data: assignment,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update assignment",
            error,
        });
    }
};
exports.updateAssignment = updateAssignment;
/* ================= VACATE ================= */
const vacateAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await LockerAssignment_1.default.findById(id);
        if (!assignment) {
            return res.status(404).json({
                message: "Assignment not found",
            });
        }
        assignment.status = "VACATED";
        assignment.vacatedAt = new Date();
        await assignment.save();
        res.json({
            message: "Locker/Cabin vacated successfully",
            data: assignment,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to vacate locker/cabin",
            error,
        });
    }
};
exports.vacateAssignment = vacateAssignment;
/* ================= DELETE ================= */
const deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await LockerAssignment_1.default.findByIdAndDelete(id);
        if (!assignment) {
            return res.status(404).json({
                message: "Assignment not found",
            });
        }
        res.json({
            message: "Assignment deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to delete assignment",
            error,
        });
    }
};
exports.deleteAssignment = deleteAssignment;
