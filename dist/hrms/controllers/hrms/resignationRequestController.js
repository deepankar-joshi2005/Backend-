"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllResignations = exports.updateResignationStatus = exports.deleteResignation = exports.updateResignation = exports.getMyResignations = exports.createResignation = void 0;
const ResignationRequest_1 = __importDefault(require("../../models/hrms/ResignationRequest"));
const Clearance_1 = __importDefault(require("../../models/hrms/Clearance"));
const cleranceController_1 = require("./cleranceController");
const User_1 = __importDefault(require("../../models/User"));
const email_1 = require("../../utils/email");
const constants_1 = require("../../constants");
/* ---------------- CREATE ---------------- */
const createResignation = async (req, res) => {
    try {
        const { resignationType, reasonCategory, reasonText, expectedLastWorkingDay, documents, } = req.body;
        const resignation = await ResignationRequest_1.default.create({
            employee: req.user.id, // authMiddleware se
            resignationType,
            reasonCategory,
            reasonText,
            expectedLastWorkingDay,
            documents,
            companyId: req.user.companyId, // Set companyId
        });
        res.status(201).json({
            message: "Resignation request submitted",
            data: resignation,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.createResignation = createResignation;
/* ---------------- GET (EMPLOYEE) ---------------- */
const getMyResignations = async (req, res) => {
    try {
        const data = await ResignationRequest_1.default.find({
            employee: req.user.id,
        }).sort({ createdAt: -1 });
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.getMyResignations = getMyResignations;
/* ---------------- UPDATE ---------------- */
const updateResignation = async (req, res) => {
    try {
        const resignation = await ResignationRequest_1.default.findOneAndUpdate({
            _id: req.params.id,
            employee: req.user.id,
            status: "PENDING",
        }, req.body, { new: true });
        if (!resignation) {
            return res.status(404).json({
                message: "Resignation not found or already processed",
            });
        }
        res.json({
            message: "Resignation updated",
            data: resignation,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.updateResignation = updateResignation;
/* ---------------- DELETE ---------------- */
const deleteResignation = async (req, res) => {
    try {
        const resignation = await ResignationRequest_1.default.findOneAndDelete({
            _id: req.params.id,
            employee: req.user.id,
            status: "PENDING",
        });
        if (!resignation) {
            return res.status(404).json({
                message: "Resignation not found or already processed",
            });
        }
        res.json({ message: "Resignation deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.deleteResignation = deleteResignation;
/* ---------------- ADMIN / HR UPDATE STATUS ---------------- */
const updateResignationStatus = async (req, res) => {
    var _a, _b;
    try {
        const { status } = req.body;
        const existingResignation = await ResignationRequest_1.default.findById(req.params.id);
        if (!existingResignation) {
            return res.status(404).json({ message: "Resignation not found" });
        }
        // Multi-tenancy check
        if (req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = existingResignation.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        const resignation = await ResignationRequest_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!resignation) {
            return res.status(404).json({ message: "Resignation not found" });
        }
        // 🔹 Get user details
        const user = await User_1.default.findById(resignation.employee);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // 🔥 AUTO CREATE CLEARANCE
        if (status === "APPROVED") {
            const exists = await Clearance_1.default.findOne({ resignation: resignation._id });
            if (!exists) {
                await (0, cleranceController_1.createClearanceFromResignation)(resignation);
            }
            // 📧 EMAIL — APPROVED
            await (0, email_1.sendCommonEmail)({
                type: email_1.CommonEmailType.RESIGNATION_APPROVED,
                to: user.email,
                name: user.name,
            });
            // 👤 DEACTIVATE USER
            user.status = "INACTIVE";
            await user.save();
        }
        if (status === "REJECTED") {
            // 📧 EMAIL — REJECTED
            await (0, email_1.sendCommonEmail)({
                type: email_1.CommonEmailType.RESIGNATION_REJECTED,
                to: user.email,
                name: user.name,
            });
        }
        res.json({
            message: "Resignation status updated",
            data: resignation,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.updateResignationStatus = updateResignationStatus;
const getAllResignations = async (req, res) => {
    try {
        const { page = "1", limit = "15", search = "" } = req.query;
        const pageNum = Math.max(Number(page), 1);
        const limitNum = Math.max(Number(limit), 1);
        const skip = (pageNum - 1) * limitNum;
        let filter = {};
        if (req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        if (search) {
            const users = await User_1.default.find({
                name: { $regex: search, $options: "i" },
                ...(req.user.role !== constants_1.ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
            }).select("_id");
            const userIds = users.map((u) => u._id);
            filter.employee = { $in: userIds };
        }
        const [data, totalRecords] = await Promise.all([
            ResignationRequest_1.default.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate({
                path: "employee",
                select: "name role departmentId employeeId",
                populate: {
                    path: "departmentId",
                    select: "name",
                },
            }),
            ResignationRequest_1.default.countDocuments(filter),
        ]);
        res.json({
            success: true,
            data,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limitNum),
            currentPage: pageNum,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.getAllResignations = getAllResignations;
