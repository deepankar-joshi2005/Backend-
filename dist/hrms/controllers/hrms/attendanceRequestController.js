"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllAttendanceRequests = exports.updateAttendanceRequestStatus = exports.getTeamAttendanceRequests = exports.deleteRequest = exports.updateRequest = exports.getMyRequests = exports.createRequest = void 0;
const AttendanceRequest_1 = __importDefault(require("../../models/hrms/AttendanceRequest"));
const Attendance_1 = __importDefault(require("../../models/hrms/Attendance"));
const User_1 = __importDefault(require("../../models/User"));
const email_1 = require("../../utils/email");
const constants_1 = require("../../constants");
/* ================= CREATE ================= */
const createRequest = async (req, res) => {
    const request = await AttendanceRequest_1.default.create({
        user: req.user.id,
        companyId: req.user.companyId,
        ...req.body,
    });
    res.status(201).json(request);
};
exports.createRequest = createRequest;
/* ================= GET MY REQUESTS ================= */
const getMyRequests = async (req, res) => {
    const data = await AttendanceRequest_1.default.find({ user: req.user.id }).sort({
        createdAt: -1,
    });
    res.json(data);
};
exports.getMyRequests = getMyRequests;
/* ================= UPDATE ================= */
const updateRequest = async (req, res) => {
    const updated = await AttendanceRequest_1.default.findOneAndUpdate({ _id: req.params.id, user: req.user.id, status: "PENDING" }, req.body, { new: true });
    res.json(updated);
};
exports.updateRequest = updateRequest;
/* ================= DELETE ================= */
const deleteRequest = async (req, res) => {
    await AttendanceRequest_1.default.findOneAndDelete({
        _id: req.params.id,
        user: req.user.id,
        status: "PENDING",
    });
    res.json({ message: "Request deleted" });
};
exports.deleteRequest = deleteRequest;
const getTeamAttendanceRequests = async (req, res) => {
    try {
        const managerId = req.user.id;
        const { page, limit = 15, search = "" } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        // 1️⃣ find employees jinka managerId = logged-in manager
        const teamFilter = { managerId };
        if (req.user.role !== constants_1.ROLES.HRMSAdmin) {
            teamFilter.companyId = req.user.companyId;
        }
        const teamMembers = await User_1.default.find(teamFilter, "_id name email role");
        const teamIds = teamMembers.map((u) => u._id);
        // 🔍 search filter
        const searchFilter = search
            ? {
                user: { $in: teamIds },
                $or: [
                    { type: { $regex: search, $options: "i" } },
                    { status: { $regex: search, $options: "i" } },
                ],
            }
            : { user: { $in: teamIds } };
        let query = AttendanceRequest_1.default.find(searchFilter)
            .populate("user", "name email role")
            .sort({ createdAt: -1 });
        if (!isNaN(pageNum) && pageNum > 0) {
            const skip = (pageNum - 1) * limitNum;
            query = query.skip(skip).limit(limitNum);
            const [requests, totalUsers] = await Promise.all([
                query,
                AttendanceRequest_1.default.countDocuments(searchFilter),
            ]);
            return res.json({
                data: requests,
                totalUsers,
                totalPages: Math.ceil(totalUsers / limitNum),
                currentPage: pageNum,
            });
        }
        const requests = await query;
        res.json(requests);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch attendance requests",
        });
    }
};
exports.getTeamAttendanceRequests = getTeamAttendanceRequests;
const updateAttendanceRequestStatus = async (req, res) => {
    try {
        const { status, adminRemark } = req.body;
        const attendance = await AttendanceRequest_1.default.findByIdAndUpdate(req.params.id, { status, adminRemark }, { new: true });
        if (!attendance) {
            return res.status(404).json({ message: "Attendance request not found" });
        }
        // ✅ Approving a regularization request must actually correct the
        // underlying Attendance record — previously this only flipped the
        // request's own status and emailed the user, so approved corrections
        // never showed up anywhere (attendance grid, payroll, etc).
        if (status === "APPROVED" && attendance.punchIn && attendance.punchOut) {
            const punchInDate = new Date(`${attendance.date}T${attendance.punchIn}:00`);
            const punchOutDate = new Date(`${attendance.date}T${attendance.punchOut}:00`);
            if (!isNaN(punchInDate.getTime()) &&
                !isNaN(punchOutDate.getTime()) &&
                punchOutDate > punchInDate) {
                const existing = await Attendance_1.default.findOne({
                    user: attendance.user,
                    date: attendance.date,
                });
                const totalBreakSeconds = (existing === null || existing === void 0 ? void 0 : existing.totalBreakSeconds) || 0;
                const totalWorkSeconds = Math.max(0, (punchOutDate.getTime() - punchInDate.getTime()) / 1000 - totalBreakSeconds);
                await Attendance_1.default.findOneAndUpdate({ user: attendance.user, date: attendance.date }, {
                    $set: {
                        punchIn: punchInDate,
                        punchOut: punchOutDate,
                        totalWorkSeconds,
                        source: "REQUEST",
                        sourceRequestId: attendance._id,
                        approvedBy: req.user.id,
                        approvedAt: new Date(),
                        companyId: attendance.companyId,
                    },
                    $setOnInsert: { breaks: [], totalBreakSeconds: 0 },
                }, { upsert: true, new: true });
            }
        }
        // 🔹 Get user details (SAME PATTERN AS RESIGNATION)
        const user = await User_1.default.findById(attendance.user);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // 📧 EMAIL — APPROVED / REJECTED
        await (0, email_1.sendCommonEmail)({
            type: email_1.CommonEmailType.ATTENDANCE_REQUEST,
            to: user.email,
            name: user.name,
            data: {
                status,
                adminRemark,
            },
        });
        res.json({
            message: "Attendance request status updated",
            data: attendance,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update attendance request",
            error,
        });
    }
};
exports.updateAttendanceRequestStatus = updateAttendanceRequestStatus;
/* ================= GET ALL ATTENDANCE REQUESTS ================= */
const getAllAttendanceRequests = async (req, res) => {
    try {
        const { page, limit = 15, search = "" } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        // 🔍 search filter
        const finalFilter = {};
        if (req.user.role !== constants_1.ROLES.HRMSAdmin) {
            finalFilter.companyId = req.user.companyId;
        }
        if (search) {
            const users = await User_1.default.find({
                name: { $regex: search, $options: "i" },
                ...(req.user.role !== constants_1.ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
            }).select("_id");
            const userIds = users.map(u => u._id);
            finalFilter.$or = [
                { user: { $in: userIds } },
                { type: { $regex: search, $options: "i" } },
                { status: { $regex: search, $options: "i" } },
            ];
        }
        let query = AttendanceRequest_1.default.find(finalFilter)
            .populate("user", "name email role managerId")
            .sort({ createdAt: -1 });
        if (!isNaN(pageNum) && pageNum > 0) {
            const skip = (pageNum - 1) * limitNum;
            query = query.skip(skip).limit(limitNum);
            const [requests, totalUsers] = await Promise.all([
                query,
                AttendanceRequest_1.default.countDocuments(finalFilter),
            ]);
            return res.json({
                data: requests,
                totalUsers,
                totalPages: Math.ceil(totalUsers / limitNum),
                currentPage: pageNum,
            });
        }
        const requests = await query;
        res.json(requests);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch all attendance requests",
        });
    }
};
exports.getAllAttendanceRequests = getAllAttendanceRequests;
