import { Response } from "express";
import LeaveEncashment from "../../models/hrms/LeaveEncashment";
import SalaryStructure from "../../models/hrms/SalaryStructure";
import Payroll from "../../models/hrms/Payroll";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

/**
 * ➕ Create Leave Encashment Request
 */
export const createLeaveEncashmentRequest = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const { leaveType, requestedDays } = req.body;
        const employeeId = req.user.id;

        if (!leaveType || !requestedDays) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Fetch salary structure - tenant isolated
        const salary = await SalaryStructure.findOne({ 
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

        const request = await LeaveEncashment.create({
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
    } catch (error: any) {
        console.error("Create encashment error:", error);
        res.status(500).json({
            message: "Failed to submit request",
            error: error.message,
        });
    }
};

/**
 * 📋 Get All Requests (Admin)
 */
export const getAllLeaveEncashmentRequests = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const filter: any = {};
        if (req.user.role !== ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }

        const requests = await LeaveEncashment.find(filter)
            .populate("employee", "name employeeId email")
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to fetch requests",
            error: error.message,
        });
    }
};

/**
 * 👤 Get My Requests (Employee)
 */
export const getMyLeaveEncashmentRequests = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const employeeId = req.user.id;
        const requests = await LeaveEncashment.find({ 
            employee: employeeId,
            companyId: req.user.companyId 
        }).sort({
            createdAt: -1,
        });

        res.json(requests);
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to fetch your requests",
            error: error.message,
        });
    }
};

/**
 * ✏️ Update Request Status (Admin)
 */
export const updateLeaveEncashmentStatus = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const adminId = req.user.id;

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const existingRequest = await LeaveEncashment.findById(id);
        if (!existingRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        // Multi-tenancy check
        if (req.user.role !== ROLES.HRMSAdmin && existingRequest.companyId?.toString() !== req.user.companyId?.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        const updateData: any = {
            status,
            approvedBy: adminId,
            approvedAt: new Date(),
        };

        if (status === "APPROVED") {
            const today = new Date();
            let monthToSet = `${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, "0")}`;

            // Check if current month payroll is already PAID - tenant isolated
            const paidPayroll = await Payroll.findOne({
                month: monthToSet,
                status: "Paid",
                companyId: req.user.companyId,
            });

            if (paidPayroll) {
                // If paid, move to next month
                today.setMonth(today.getMonth() + 1);
                monthToSet = `${today.getFullYear()}-${String(
                    today.getMonth() + 1
                ).padStart(2, "0")}`;
            }

            updateData.payrollMonth = monthToSet;
        }

        const request = await LeaveEncashment.findByIdAndUpdate(id, updateData, {
            new: true,
        }).populate("employee", "name email");

        res.json({
            message: `Leave encashment request ${status.toLowerCase()} successfully`,
            request,
        });
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to update status",
            error: error.message,
        });
    }
};
