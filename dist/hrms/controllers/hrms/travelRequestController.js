"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadTravelReceipt = exports.updateManagerTravelStatus = exports.getManagerTravelRequests = exports.updateTravelRequestStatus = exports.deleteTravelRequest = exports.updateTravelRequest = exports.getAllTravelRequests = exports.getMyTravelRequests = exports.createTravelRequest = void 0;
const TravelRequest_1 = __importDefault(require("../../models/hrms/TravelRequest"));
const User_1 = __importDefault(require("../../models/User"));
/* ================= CREATE ================= */
const createTravelRequest = async (req, res) => {
    try {
        const { purpose, destination, fromDate, toDate, budget, remarks } = req.body;
        const request = await TravelRequest_1.default.create({
            employee: req.user.id,
            purpose,
            destination,
            fromDate,
            toDate,
            budget,
            remarks,
            // 👇 initially finance fields empty
            payable: undefined,
            paymentStatus: "UNPAID",
            // 👇 if receipt uploaded
            receiptUrl: req.file ? `/uploads/travel/${req.file.filename}` : undefined,
            status: "PENDING",
        });
        res.status(201).json(request);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to create travel request",
        });
    }
};
exports.createTravelRequest = createTravelRequest;
/* ================= GET MY REQUESTS (EMPLOYEE) ================= */
const getMyTravelRequests = async (req, res) => {
    try {
        const requests = await TravelRequest_1.default.find({
            employee: req.user.id,
        }).sort({ createdAt: -1 });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch travel requests" });
    }
};
exports.getMyTravelRequests = getMyTravelRequests;
/* ================= GET ALL (HR / ADMIN) ================= */
const getAllTravelRequests = async (req, res) => {
    try {
        const requests = await TravelRequest_1.default.find()
            .populate("employee", "name email")
            .sort({ createdAt: -1 });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch requests" });
    }
};
exports.getAllTravelRequests = getAllTravelRequests;
/* ================= UPDATE (VIEW / EDIT) ================= */
const updateTravelRequest = async (req, res) => {
    try {
        const request = await TravelRequest_1.default.findOneAndUpdate({
            _id: req.params.id,
        }, req.body, { new: true });
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        res.json(request);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update request" });
    }
};
exports.updateTravelRequest = updateTravelRequest;
/* ================= DELETE ================= */
const deleteTravelRequest = async (req, res) => {
    try {
        const request = await TravelRequest_1.default.findOneAndDelete({
            _id: req.params.id,
            employee: req.user.id,
        });
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        res.json({ message: "Travel request deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete request" });
    }
};
exports.deleteTravelRequest = deleteTravelRequest;
/* ================= APPROVE / REJECT (HR) ================= */
const updateTravelRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const request = await TravelRequest_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        res.json(request);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update status" });
    }
};
exports.updateTravelRequestStatus = updateTravelRequestStatus;
const getManagerTravelRequests = async (req, res) => {
    try {
        const managerId = req.user.id;
        const team = await User_1.default.find({ managerId }, "_id");
        const employeeIds = team.map((u) => u._id);
        const requests = await TravelRequest_1.default.find({
            employee: { $in: employeeIds },
        })
            .populate("employee", "name email")
            .sort({ createdAt: -1 });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch manager travel requests",
        });
    }
};
exports.getManagerTravelRequests = getManagerTravelRequests;
const updateManagerTravelStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const request = await TravelRequest_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        res.json(request);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update status" });
    }
};
exports.updateManagerTravelStatus = updateManagerTravelStatus;
const uploadTravelReceipt = async (req, res) => {
    var _a;
    try {
        const travel = await TravelRequest_1.default.findById(req.params.id);
        if (!travel) {
            return res.status(404).json({ message: "Travel request not found" });
        }
        if (((_a = travel.status) === null || _a === void 0 ? void 0 : _a.toUpperCase()) !== "APPROVED") {
            return res
                .status(400)
                .json({ message: "Receipt allowed only for approved travel" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "Receipt file required" });
        }
        travel.receiptUrl = `/uploads/travel/${req.file.filename}`;
        await travel.save();
        res.json(travel);
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to upload receipt",
        });
    }
};
exports.uploadTravelReceipt = uploadTravelReceipt;
