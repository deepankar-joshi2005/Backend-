"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamOvertimeRequests = exports.deleteOvertime = exports.updateOvertime = exports.getMyOvertimeRequests = exports.createOvertime = void 0;
const Overtime_1 = __importDefault(require("../../models/hrms/Overtime"));
const User_1 = __importDefault(require("../../models/User"));
/* ================= CREATE ================= */
const createOvertime = async (req, res) => {
    try {
        const { date, startTime, endTime, reason } = req.body;
        if (!date || !startTime || !endTime || !reason) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // hours calculate
        const start = new Date(`1970-01-01T${startTime}`);
        const end = new Date(`1970-01-01T${endTime}`);
        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (diff <= 0) {
            return res.status(400).json({ message: "Invalid time range" });
        }
        const overtime = await Overtime_1.default.create({
            employee: req.user._id,
            date,
            startTime,
            endTime,
            hours: diff,
            reason,
        });
        res.status(201).json(overtime);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create overtime request" });
    }
};
exports.createOvertime = createOvertime;
/* ================= GET MY REQUESTS ================= */
const getMyOvertimeRequests = async (req, res) => {
    try {
        const data = await Overtime_1.default.find({ employee: req.user._id }).sort({
            createdAt: -1,
        });
        res.json(data);
    }
    catch {
        res.status(500).json({ message: "Failed to fetch overtime requests" });
    }
};
exports.getMyOvertimeRequests = getMyOvertimeRequests;
/* ================= UPDATE ================= */
const updateOvertime = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, startTime, endTime, reason, status } = req.body;
        const overtime = await Overtime_1.default.findById(id);
        if (!overtime) {
            return res.status(404).json({
                message: "Overtime request not found",
            });
        }
        /* ================= ROLE BASED LOGIC ================= */
        // 🔹 EMPLOYEE: can edit only when PENDING
        if (req.user.role === "employee") {
            if (overtime.employee.toString() !== req.user._id.toString() ||
                overtime.status !== "PENDING") {
                return res.status(403).json({
                    message: "You are not allowed to update this request",
                });
            }
            if (date)
                overtime.date = date;
            if (startTime)
                overtime.startTime = startTime;
            if (endTime)
                overtime.endTime = endTime;
            if (reason)
                overtime.reason = reason;
            // recalc hours
            const start = new Date(`1970-01-01T${overtime.startTime}`);
            const end = new Date(`1970-01-01T${overtime.endTime}`);
            overtime.hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }
        // 🔹 MANAGER: can approve / reject
        if (req.user.role === "manager") {
            if (!["APPROVED", "REJECTED"].includes(status)) {
                return res.status(400).json({
                    message: "Invalid status",
                });
            }
            if (overtime.status !== "PENDING") {
                return res.status(400).json({
                    message: "Request already processed",
                });
            }
            overtime.status = status;
        }
        await overtime.save();
        res.json({
            message: "Overtime request updated successfully",
            overtime,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update overtime request",
        });
    }
};
exports.updateOvertime = updateOvertime;
/* ================= DELETE ================= */
const deleteOvertime = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Overtime_1.default.findOneAndDelete({
            _id: id,
            employee: req.user._id,
            status: "PENDING",
        });
        if (!deleted) {
            return res
                .status(404)
                .json({ message: "Overtime request not found or locked" });
        }
        res.json({ message: "Overtime request deleted successfully" });
    }
    catch {
        res.status(500).json({ message: "Failed to delete overtime request" });
    }
};
exports.deleteOvertime = deleteOvertime;
/* ================= GET TEAM REQUESTS (MANAGER) ================= */
const getTeamOvertimeRequests = async (req, res) => {
    try {
        const managerId = req.user.id;
        // 1️⃣ find team members (jinka managerId = logged-in manager)
        const teamMembers = await User_1.default.find({ managerId }, "_id name email role");
        const teamIds = teamMembers.map((u) => u._id);
        // 2️⃣ un employees ki overtime requests
        const requests = await Overtime_1.default.find({
            employee: { $in: teamIds },
        })
            .populate("employee", "name email role")
            .sort({ createdAt: -1 });
        res.json(requests);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch team overtime requests",
        });
    }
};
exports.getTeamOvertimeRequests = getTeamOvertimeRequests;
