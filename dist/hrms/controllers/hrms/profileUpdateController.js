"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamProfileUpdateRequests = exports.deleteProfileUpdate = exports.updateProfileUpdate = exports.getMyProfileUpdates = exports.createProfileUpdate = void 0;
const ProfileUpdate_1 = __importDefault(require("../../models/hrms/ProfileUpdate"));
const User_1 = __importDefault(require("../../models/User"));
/* ================= CREATE ================= */
const createProfileUpdate = async (req, res) => {
    try {
        const { updateType, newValue, reason } = req.body;
        if (!updateType || !newValue || !reason) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }
        const request = await ProfileUpdate_1.default.create({
            employee: req.user.id,
            updateType,
            newValue,
            reason,
        });
        res.status(201).json(request);
    }
    catch (err) {
        res.status(500).json({
            message: err.message || "Failed to create profile update request",
        });
    }
};
exports.createProfileUpdate = createProfileUpdate;
/* ================= GET MY REQUESTS ================= */
const getMyProfileUpdates = async (req, res) => {
    try {
        const requests = await ProfileUpdate_1.default.find({
            employee: req.user.id,
        }).sort({ createdAt: -1 });
        res.json(requests);
    }
    catch {
        res.status(500).json({ message: "Failed to fetch requests" });
    }
};
exports.getMyProfileUpdates = getMyProfileUpdates;
/* ================= UPDATE (EDIT) ================= */
const updateProfileUpdate = async (req, res) => {
    try {
        const { updateType, newValue, reason, status } = req.body;
        const requestId = req.params.id;
        const request = await ProfileUpdate_1.default.findById(requestId);
        if (!request) {
            return res.status(404).json({
                message: "Profile update request not found",
            });
        }
        /* ================= EMPLOYEE EDIT ================= */
        if (status === undefined) {
            // only owner can edit & only PENDING
            if (request.employee.toString() !== req.user.id ||
                request.status !== "PENDING") {
                return res.status(403).json({
                    message: "You are not allowed to edit this request",
                });
            }
            if (!updateType || !newValue || !reason) {
                return res.status(400).json({
                    message: "All fields are required",
                });
            }
            request.updateType = updateType;
            request.newValue = newValue;
            request.reason = reason;
            await request.save();
            return res.json(request);
        }
        /* ================= MANAGER / HR STATUS UPDATE ================= */
        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status value",
            });
        }
        if (request.status !== "PENDING") {
            return res.status(400).json({
                message: "Request already processed",
            });
        }
        request.status = status;
        /* ================= APPLY PROFILE CHANGE ON APPROVE ================= */
        if (status === "APPROVED") {
            await User_1.default.findByIdAndUpdate(request.employee, {
                [request.updateType]: request.newValue,
            });
        }
        await request.save();
        res.json(request);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update profile request",
        });
    }
};
exports.updateProfileUpdate = updateProfileUpdate;
/* ================= DELETE ================= */
const deleteProfileUpdate = async (req, res) => {
    try {
        const request = await ProfileUpdate_1.default.findOneAndDelete({
            _id: req.params.id,
            employee: req.user.id,
            status: "PENDING",
        });
        if (!request) {
            return res.status(404).json({
                message: "Request not found or cannot be deleted",
            });
        }
        res.json({ message: "Profile update request deleted successfully" });
    }
    catch {
        res.status(500).json({ message: "Failed to delete request" });
    }
};
exports.deleteProfileUpdate = deleteProfileUpdate;
const getTeamProfileUpdateRequests = async (req, res) => {
    try {
        const managerId = req.user.id;
        // 1️⃣ find employees under this manager
        const teamMembers = await User_1.default.find({ managerId }, "_id name email role");
        const teamIds = teamMembers.map((u) => u._id);
        // 2️⃣ fetch profile update requests of those employees
        const requests = await ProfileUpdate_1.default.find({
            employee: { $in: teamIds },
        })
            .populate("employee", "name email role")
            .sort({ createdAt: -1 });
        res.json(requests);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch team profile update requests",
        });
    }
};
exports.getTeamProfileUpdateRequests = getTeamProfileUpdateRequests;
