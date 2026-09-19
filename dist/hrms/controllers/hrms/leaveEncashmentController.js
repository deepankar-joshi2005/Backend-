"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLeaveEncashmentStatus = exports.getMyLeaveEncashmentRequests = exports.getAllLeaveEncashmentRequests = exports.createLeaveEncashmentRequest = void 0;
const LeaveEncashment_1 = __importDefault(require("../../models/hrms/LeaveEncashment"));
const SalaryStructure_1 = __importDefault(require("../../models/hrms/SalaryStructure"));
const Payroll_1 = __importDefault(require("../../models/hrms/Payroll"));
const constants_1 = require("../../constants");
/**
 * ➕ Create Leave Encashment Request
 */
const createLeaveEncashmentRequest = async (req, res) => {
    try {
        const { leaveType, requestedDays } = req.body;
        const employeeId = req.user.id;
        if (!leaveType || !requestedDays) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // Fetch salary structure - tenant isolated
        const salary = await SalaryStructure_1.default.findOne({
            employee: employeeId,
            companyId: req.user.companyId
        });
        if (!salary) {
            return res.status(404).json({
                message: "Salary structure not found for this employee. Cannot calculate encashment amount.",
            });
        }
        // Calculation: Basic / 30 = Per Day Rate
        const perDayRate = Math.round(salary.basic / 30);
        const totalAmount = perDayRate * requestedDays;
        const request = await LeaveEncashment_1.default.create({
            employee: employeeId,
            leaveType,
            requestedDays,
            perDayRate,
            totalAmount,
            status: "PENDING",
            companyId: req.user.companyId,
        });
        res.status(201).json({
            message: "Leave encashment request submitted successfully",
            request,
        });
    }
    catch (error) {
        console.error("Create encashment error:", error);
        res.status(500).json({
            message: "Failed to submit request",
            error: error.message,
        });
    }
};
exports.createLeaveEncashmentRequest = createLeaveEncashmentRequest;
/**
 * 📋 Get All Requests (Admin)
 */
const getAllLeaveEncashmentRequests = async (req, res) => {
    try {
        const filter = {};
        if (req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        const requests = await LeaveEncashment_1.default.find(filter)
            .populate("employee", "name employeeId email")
            .sort({ createdAt: -1 });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch requests",
            error: error.message,
        });
    }
};
exports.getAllLeaveEncashmentRequests = getAllLeaveEncashmentRequests;
/**
 * 👤 Get My Requests (Employee)
 */
const getMyLeaveEncashmentRequests = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const requests = await LeaveEncashment_1.default.find({
            employee: employeeId,
            companyId: req.user.companyId
        }).sort({
            createdAt: -1,
        });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch your requests",
            error: error.message,
        });
    }
};
exports.getMyLeaveEncashmentRequests = getMyLeaveEncashmentRequests;
/**
 * ✏️ Update Request Status (Admin)
 */
const updateLeaveEncashmentStatus = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const { status } = req.body;
        const adminId = req.user.id;
        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const existingRequest = await LeaveEncashment_1.default.findById(id);
        if (!existingRequest) {
            return res.status(404).json({ message: "Request not found" });
        }
        // Multi-tenancy check
        if (req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = existingRequest.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        const updateData = {
            status,
            approvedBy: adminId,
            approvedAt: new Date(),
        };
        if (status === "APPROVED") {
            const today = new Date();
            let monthToSet = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
            // Check if current month payroll is already PAID - tenant isolated
            const paidPayroll = await Payroll_1.default.findOne({
                month: monthToSet,
                status: "Paid",
                companyId: req.user.companyId,
            });
            if (paidPayroll) {
                // If paid, move to next month
                today.setMonth(today.getMonth() + 1);
                monthToSet = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
            }
            updateData.payrollMonth = monthToSet;
        }
        const request = await LeaveEncashment_1.default.findByIdAndUpdate(id, updateData, {
            new: true,
        }).populate("employee", "name email");
        res.json({
            message: `Leave encashment request ${status.toLowerCase()} successfully`,
            request,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update status",
            error: error.message,
        });
    }
};
exports.updateLeaveEncashmentStatus = updateLeaveEncashmentStatus;
