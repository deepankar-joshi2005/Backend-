import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import Leave from "../../models/hrms/Leave";
import LeaveType from "../../models/hrms/LeaveType";
import LeaveBalanceAdjustment from "../../models/hrms/LeaveBalanceAdjustment";
import User from "../../models/User";
import mongoose from "mongoose";

// ================= HELPER: CALCULATE CURRENT BALANCE =================
const getEmployeeBalance = async (employeeId: string, leaveTypeName: string) => {
    const leaveTypeDoc = await LeaveType.findOne({ name: leaveTypeName });
    if (!leaveTypeDoc) return 0;

    const empObjectId = new mongoose.Types.ObjectId(employeeId);

    // 1. Calculate used leaves (APPROVED)
    const usedAgg = await Leave.aggregate([
        {
            $match: {
                employee: empObjectId,
                leaveType: leaveTypeName,
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
    const usedLeaves = usedAgg[0]?.total || 0;

    // 2. Calculate sum of manual adjustments
    const adjAgg = await LeaveBalanceAdjustment.aggregate([
        {
            $match: {
                employee: empObjectId,
                leaveType: leaveTypeName,
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$adjustment" },
            },
        },
    ]);
    const totalAdjustments = adjAgg[0]?.total || 0;

    // Initial balance (maxDays) + adjustments - used
    return leaveTypeDoc.maxDays + totalAdjustments - usedLeaves;
};

// ================= GET CURRENT BALANCE API =================
export const getBalance = async (req: AuthRequest, res: Response) => {
    try {
        const { employeeId, leaveType } = req.query;
        if (!employeeId || !leaveType) {
            return res.status(400).json({ message: "Employee ID and Leave Type are required" });
        }

        const balance = await getEmployeeBalance(employeeId as string, leaveType as string);
        res.json({ balance });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch balance" });
    }
};

// ================= OVERRIDE BALANCE (CREATE ADJUSTMENT) =================
export const overrideBalance = async (req: AuthRequest, res: Response) => {
    try {
        const { employeeId, leaveType, newBalance, reason, effectiveDate } = req.body;

        if (!employeeId || !leaveType || newBalance === undefined || !reason) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const currentBalance = await getEmployeeBalance(employeeId, leaveType);
        const adjustmentValue = newBalance - currentBalance;

        if (adjustmentValue === 0) {
            return res.status(400).json({ message: "New balance is same as current balance" });
        }

        const adjustment = await LeaveBalanceAdjustment.create({
            employee: employeeId,
            leaveType,
            oldBalance: currentBalance,
            newBalance,
            adjustment: adjustmentValue,
            reason,
            addedBy: req.user.id,
            effectiveDate: effectiveDate || new Date(),
        });

        res.status(201).json({
            message: "Balance adjusted successfully",
            adjustment,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to override balance" });
    }
};

// ================= GET MY BALANCES (FOR EMPLOYEE) =================
export const getMyBalances = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const empObjectId = new mongoose.Types.ObjectId(userId as string);

        // 1. Get all leave types
        const leaveTypes = await LeaveType.find({ isActive: true });

        // 2. Get used leaves summary
        const usedAgg = await Leave.aggregate([
            {
                $match: {
                    employee: empObjectId,
                    status: "APPROVED",
                },
            },
            {
                $group: {
                    _id: "$leaveType",
                    total: { $sum: "$totalDays" },
                },
            },
        ]);

        // 3. Get adjustments summary
        const adjAgg = await LeaveBalanceAdjustment.aggregate([
            {
                $match: {
                    employee: empObjectId,
                },
            },
            {
                $group: {
                    _id: "$leaveType",
                    total: { $sum: "$adjustment" },
                },
            },
        ]);

        const usedMap = Object.fromEntries(usedAgg.map((u) => [u._id, u.total]));
        const adjMap = Object.fromEntries(adjAgg.map((a) => [a._id, a.total]));

        const summary = leaveTypes.map((lt) => {
            const used = usedMap[lt.name] || 0;
            const adj = adjMap[lt.name] || 0;
            const balance = lt.maxDays + adj - used;

            return {
                leaveType: lt.name,
                maxDays: lt.maxDays,
                used,
                adjustments: adj,
                balance: balance < 0 ? 0 : balance,
            };
        });

        res.json(summary);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch leave summary" });
    }
};

// ================= GET ADJUSTMENT HISTORY =================
export const getAdjustmentHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { employeeId } = req.query;
        const filter = employeeId ? { employee: employeeId } : {};

        const history = await LeaveBalanceAdjustment.find(filter)
            .populate("employee", "name employeeId")
            .populate("addedBy", "name role")
            .sort({ createdAt: -1 });

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch adjustment history" });
    }
};
