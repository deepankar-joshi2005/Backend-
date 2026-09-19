"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllEmployeesLeaveRequests = exports.updateLeaveStatus = exports.getAllLeaveRequests = exports.getTodayTeamLeaves = exports.deleteLeave = exports.updateLeave = exports.getMyLeaves = exports.applyLeave = void 0;
const Leave_1 = __importDefault(require("../../models/hrms/Leave"));
const LeaveType_1 = __importDefault(require("../../models/hrms/LeaveType"));
const LeaveBalanceAdjustment_1 = __importDefault(require("../../models/hrms/LeaveBalanceAdjustment"));
const User_1 = __importDefault(require("../../models/User"));
const email_1 = require("../../utils/email");
const mongoose_1 = __importDefault(require("mongoose"));
const constants_1 = require("../../constants");
// ================= HELPER =================
const calculateDays = (from, to) => {
    const diff = new Date(to).getTime() - new Date(from).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
};
// ================= APPLY LEAVE =================
const applyLeave = async (req, res) => {
    var _a, _b;
    try {
        const { leaveType, fromDate, toDate, reason } = req.body;
        if (!leaveType || !fromDate || !toDate || !reason) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // 🔹 calculate requested days
        const totalDays = calculateDays(fromDate, toDate);
        if (totalDays <= 0) {
            return res.status(400).json({ message: "Invalid leave duration" });
        }
        // 🔹 get leave type config
        const leaveTypeDoc = await LeaveType_1.default.findOne({ name: leaveType });
        if (!leaveTypeDoc) {
            return res.status(400).json({ message: "Invalid leave type" });
        }
        const empObjectId = new mongoose_1.default.Types.ObjectId(req.user.id);
        // 🔹 calculate used leaves (APPROVED only)
        const usedAgg = await Leave_1.default.aggregate([
            {
                $match: {
                    employee: empObjectId,
                    leaveType,
                    status: "APPROVED",
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalDays" },
                },
            },
        ]);
        const usedLeaves = ((_a = usedAgg[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
        // 🔹 calculate sum of manual adjustments
        const adjAgg = await LeaveBalanceAdjustment_1.default.aggregate([
            {
                $match: {
                    employee: empObjectId,
                    leaveType,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$adjustment" },
                },
            },
        ]);
        const totalAdjustments = ((_b = adjAgg[0]) === null || _b === void 0 ? void 0 : _b.total) || 0;
        const remainingLeaves = leaveTypeDoc.maxDays + totalAdjustments - usedLeaves;
        // 🔹 validation
        if (totalDays > remainingLeaves) {
            return res.status(400).json({
                message: `Only ${remainingLeaves} leave(s) remaining for ${leaveType}`,
            });
        }
        // 🔹 create leave (NO remainingLeaves saved)
        const leave = await Leave_1.default.create({
            employee: req.user.id,
            leaveType,
            fromDate,
            toDate,
            totalDays,
            reason,
            status: "PENDING",
            companyId: (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId, // Set companyId correctly for admins
        });
        res.status(201).json(leave);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to apply leave" });
    }
};
exports.applyLeave = applyLeave;
// ================= GET MY LEAVES =================
const getMyLeaves = async (req, res) => {
    try {
        const leaves = await Leave_1.default.find({
            employee: req.user.id,
        }).sort({ createdAt: -1 });
        res.json(leaves);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch leaves" });
    }
};
exports.getMyLeaves = getMyLeaves;
// ================= UPDATE LEAVE =================
const updateLeave = async (req, res) => {
    var _a, _b;
    try {
        const { leaveType, fromDate, toDate, reason } = req.body;
        const leave = await Leave_1.default.findOne({
            _id: req.params.id,
            employee: req.user.id,
        });
        if (!leave) {
            return res.status(404).json({ message: "Leave not found" });
        }
        if (leave.status !== "PENDING") {
            return res
                .status(400)
                .json({ message: "Approved / Rejected leave can't be edited" });
        }
        const totalDays = calculateDays(fromDate, toDate);
        const leaveTypeDoc = await LeaveType_1.default.findOne({ name: leaveType });
        if (!leaveTypeDoc) {
            return res.status(400).json({ message: "Invalid leave type" });
        }
        const empObjectId = new mongoose_1.default.Types.ObjectId(req.user.id);
        const usedAgg = await Leave_1.default.aggregate([
            {
                $match: {
                    employee: empObjectId,
                    leaveType,
                    status: "APPROVED",
                    _id: { $ne: leave._id },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalDays" },
                },
            },
        ]);
        const usedLeaves = ((_a = usedAgg[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
        // 🔹 calculate sum of manual adjustments
        const adjAgg = await LeaveBalanceAdjustment_1.default.aggregate([
            {
                $match: {
                    employee: empObjectId,
                    leaveType,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$adjustment" },
                },
            },
        ]);
        const totalAdjustments = ((_b = adjAgg[0]) === null || _b === void 0 ? void 0 : _b.total) || 0;
        const remainingLeaves = leaveTypeDoc.maxDays + totalAdjustments - usedLeaves;
        if (totalDays > remainingLeaves) {
            return res.status(400).json({
                message: `Only ${remainingLeaves} leave(s) remaining for ${leaveType}`,
            });
        }
        leave.leaveType = leaveType;
        leave.fromDate = fromDate;
        leave.toDate = toDate;
        leave.totalDays = totalDays;
        leave.reason = reason;
        await leave.save();
        res.json(leave);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update leave" });
    }
};
exports.updateLeave = updateLeave;
// ================= DELETE LEAVE =================
const deleteLeave = async (req, res) => {
    try {
        const leave = await Leave_1.default.findOneAndDelete({
            _id: req.params.id,
            employee: req.user.id,
            status: "PENDING",
        });
        if (!leave) {
            return res
                .status(404)
                .json({ message: "Leave not found or can't be deleted" });
        }
        res.json({ message: "Leave deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete leave" });
    }
};
exports.deleteLeave = deleteLeave;
const getTodayTeamLeaves = async (req, res) => {
    try {
        const managerId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const leaves = await Leave_1.default.find({
            status: "APPROVED",
            fromDate: { $lte: today },
            toDate: { $gte: today },
            ...(!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {}),
        })
            .populate({
            path: "employee",
            select: "name role email managerId",
            match: { managerId }, // ✅ sirf is manager ki team
        })
            .sort({ fromDate: 1 });
        // ❗ populate ke baad null employees hata do
        const filteredLeaves = leaves.filter((leave) => leave.employee);
        res.json(filteredLeaves);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch today team leaves",
        });
    }
};
exports.getTodayTeamLeaves = getTodayTeamLeaves;
const getAllLeaveRequests = async (req, res) => {
    try {
        const managerId = req.user.id;
        // 🔹 Step 1: manager ke under ke employees
        const teamEmployees = await User_1.default.find({ managerId }, "_id");
        const employeeIds = teamEmployees.map((e) => e._id);
        // 🔹 Step 2: un employees ki leave requests
        const leaves = await Leave_1.default.find({
            employee: { $in: employeeIds },
            ...(!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {}),
        })
            .populate("employee", "name email role")
            .sort({ createdAt: -1 });
        res.status(200).json(leaves);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch leave requests",
        });
    }
};
exports.getAllLeaveRequests = getAllLeaveRequests;
/* ================= UPDATE LEAVE STATUS ================= */
const updateLeaveStatus = async (req, res) => {
    var _a, _b;
    try {
        const { status, remark } = req.body;
        const { id } = req.params;
        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const existingLeave = await Leave_1.default.findById(id);
        if (!existingLeave) {
            return res.status(404).json({ message: "Leave not found" });
        }
        // Multi-tenancy check
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = existingLeave.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        const leave = await Leave_1.default.findByIdAndUpdate(id, { status, remark }, { new: true }).populate("employee", "name email");
        if (!leave || !leave.employee) {
            return res.status(404).json({ message: "Leave not found" });
        }
        const employee = leave.employee;
        // 📧 SEND EMAIL
        await (0, email_1.sendCommonEmail)({
            type: status === "APPROVED"
                ? email_1.CommonEmailType.LEAVE_APPROVED
                : email_1.CommonEmailType.LEAVE_REJECTED,
            to: employee.email,
            name: employee.name,
            data: {
                from: leave.fromDate,
                to: leave.toDate,
                remark,
            },
        });
        res.status(200).json(leave);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update leave status" });
    }
};
exports.updateLeaveStatus = updateLeaveStatus;
// ================= GET ALL EMPLOYEES LEAVE REQUESTS (HR / ADMIN) =================
const getAllEmployeesLeaveRequests = async (req, res) => {
    try {
        const filter = {};
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        const leaves = await Leave_1.default.find(filter)
            .populate("employee", "name email role managerId")
            .sort({ createdAt: -1 });
        res.status(200).json(leaves);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch all leave requests",
        });
    }
};
exports.getAllEmployeesLeaveRequests = getAllEmployeesLeaveRequests;
