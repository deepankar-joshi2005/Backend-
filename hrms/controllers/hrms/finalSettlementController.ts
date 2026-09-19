import { Response } from "express";
import User from "../../models/User";
import FinalSettlement from "../../models/hrms/FinalSettlement";
import SalaryStructure from "../../models/hrms/SalaryStructure";
import Payroll from "../../models/hrms/Payroll";
import ResignationRequest from "../../models/hrms/ResignationRequest";
import Attendance from "../../models/hrms/Attendance";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

/**
 * Helper to format date as YYYY-MM-DD in local time
 */
const formatDateLocal = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Get all inactive users and their settlement details with automated calculation
 */
export const getInactiveUsersSettlements = async (req: AuthRequest, res: Response) => {
    try {
        const { companyId, role } = req.user;
        const { page = "1", limit = "15", search = "" } = req.query;
        const pageNum = Math.max(Number(page), 1);
        const limitNum = Math.max(Number(limit), 1);
        const skip = (pageNum - 1) * limitNum;

        // Find all users with status "INACTIVE" - Tenant Isolated
        const userFilter: any = { status: "INACTIVE" };
        if (role !== ROLES.HRMSAdmin) {
            userFilter.companyId = companyId;
        }
        if (search) {
            userFilter.$or = [
                { name: { $regex: search, $options: "i" } },
                { employeeId: { $regex: search, $options: "i" } },
            ];
        }

        const totalRecords = await User.countDocuments(userFilter);

        const inactiveUsers = await User.find(userFilter)
            .populate("departmentId", "name")
            .populate("designationId", "name")
            .skip(skip)
            .limit(limitNum)
            .lean();

        console.log(`[F&F DEBUG] Found ${inactiveUsers.length} inactive users for company ${companyId}`);

        // Fetch existing settlement records - Tenant Isolated
        const settlementFilter: any = {
            userId: { $in: inactiveUsers.map((u) => u._id) }
        };
        if (role !== ROLES.HRMSAdmin) {
            settlementFilter.companyId = companyId;
        }

        const settlements = await FinalSettlement.find(settlementFilter).lean();

        // Map settlement status to users with calculations
        const result = await Promise.all(inactiveUsers.map(async (user) => {
            const settlement = settlements.find(
                (s) => s.userId.toString() === user._id.toString()
            );

            // --- Calculation Logic ---
            let calculatedDetails = settlement || {
                lastMonthSalary: 0,
                unpaidSalary: 0,
                leaveEncashment: 0,
                bonus: 0,
                earnings: 0,
                deductions: 0,
                netPayable: 0,
                lastWorkingDay: null
            };

            if (!settlement || settlement.status === "NOT_STARTED") {
                // 1. Get Resignation Details - Tenant Isolated
                const resignation = await ResignationRequest.findOne({
                    employee: user._id,
                    status: "APPROVED",
                    ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
                }).sort({ createdAt: -1 });

                const lastWorkingDay = resignation ? resignation.expectedLastWorkingDay : null;

                // 2. Get Salary Structure - Tenant Isolated
                const salary = await SalaryStructure.findOne({ 
                    employee: user._id,
                    ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
                });

                if (salary && lastWorkingDay) {
                    const basic = salary.basic || 0;
                    const gross = basic + (salary.hra || 0) + (salary.otherAllowance || 0);
                    const perDayGross = gross / 30;

                    const lwd = new Date(lastWorkingDay);
                    const firstOfLastMonth = new Date(lwd.getFullYear(), lwd.getMonth(), 1);

                    const firstDayOfLastMonthStr = formatDateLocal(firstOfLastMonth);
                    const lastDayOfLastMonthStr = formatDateLocal(lwd);

                    // 3. Calculate Last Month Salary (Attendance Based) - Tenant Isolated
                    const lastMonthAttendance = await Attendance.countDocuments({
                        user: user._id,
                        date: { $gte: firstDayOfLastMonthStr, $lte: lastDayOfLastMonthStr },
                        status: "PRESENT",
                        ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
                    });

                    calculatedDetails.lastMonthSalary = Math.round(lastMonthAttendance * perDayGross);
                    calculatedDetails.lastWorkingDay = lastWorkingDay;

                    // 4. Calculate Unpaid Salary (Attendance Based) - Tenant Isolated
                    const lastPayroll = await Payroll.findOne({
                        employee: user._id,
                        status: "Paid",
                        ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
                    }).sort({ month: -1 });

                    let unpaidTotal = 0;

                    let checkDate: Date;
                    if (lastPayroll) {
                        const [year, month] = lastPayroll.month.split("-").map(Number);
                        checkDate = new Date(year, month, 1);
                    } else {
                        const joinDate = new Date(user.joiningDate);
                        checkDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
                    }

                    const resignationMonthStart = new Date(lwd.getFullYear(), lwd.getMonth(), 1);

                    while (checkDate < resignationMonthStart) {
                        const y = checkDate.getFullYear();
                        const m = checkDate.getMonth();
                        const firstDay = formatDateLocal(new Date(y, m, 1));
                        const lastDay = formatDateLocal(new Date(y, m + 1, 0));

                        const presentDays = await Attendance.countDocuments({
                            user: user._id,
                            date: { $gte: firstDay, $lte: lastDay },
                            status: "PRESENT",
                            ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
                        });

                        unpaidTotal += presentDays * perDayGross;
                        checkDate.setMonth(checkDate.getMonth() + 1);
                    }

                    calculatedDetails.unpaidSalary = Math.round(unpaidTotal);
                    calculatedDetails.leaveEncashment = 0;

                    calculatedDetails.earnings = calculatedDetails.lastMonthSalary +
                        calculatedDetails.unpaidSalary +
                        (calculatedDetails.bonus || 0);

                    calculatedDetails.netPayable = calculatedDetails.earnings - calculatedDetails.deductions;
                }
            }

            return {
                ...user,
                settlementStatus: settlement ? settlement.status : "NOT_STARTED",
                settlementDetails: calculatedDetails,
            };
        }));

        return res.status(200).json({
            success: true,
            data: result,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limitNum),
            currentPage: pageNum,
        });
    } catch (error: any) {
        console.error("F&F Calculation Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Update or create settlement record for a user
 */
export const updateSettlementStatus = async (req: AuthRequest, res: Response) => {
    try {
        const {
            userId, status, earnings, deductions, notes,
            lastMonthSalary, unpaidSalary, leaveEncashment, bonus, lastWorkingDay
        } = req.body;

        if (!userId || !status) {
            return res.status(400).json({
                success: false,
                message: "User ID and status are required",
            });
        }

        const { companyId, role } = req.user;

        // Verify user belongs to same company
        const targetUser = await User.findById(userId);
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        if (role !== ROLES.HRMSAdmin && targetUser.companyId?.toString() !== companyId?.toString()) {
            return res.status(403).json({ message: "Access denied. User belongs to another company." });
        }

        const netPayable = (earnings || 0) - (deductions || 0);

        const settlement = await FinalSettlement.findOneAndUpdate(
            { userId },
            {
                status,
                earnings: earnings || 0,
                deductions: deductions || 0,
                netPayable,
                notes: notes || "",
                lastMonthSalary: lastMonthSalary || 0,
                unpaidSalary: unpaidSalary || 0,
                leaveEncashment: leaveEncashment || 0,
                bonus: bonus || 0,
                lastWorkingDay: lastWorkingDay ? new Date(lastWorkingDay) : null,
                settlementDate: status === "FINAL" ? new Date() : null,
                companyId: companyId, // Ensure companyId is saved
            },
            { new: true, upsert: true }
        );

        // If status is FINAL, add to Payroll
        if (status === "FINAL") {
            const today = new Date();
            const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

            // Check if payroll for current month is already paid - Tenant Isolated
            const paidPayroll = await Payroll.findOne({ 
                month: currentMonth, 
                status: "Paid",
                ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
            });

            const payrollMonth = paidPayroll ?
                `${today.getFullYear()}-${String(today.getMonth() + 2).padStart(2, '0')}` :
                currentMonth;

            await Payroll.findOneAndUpdate(
                { 
                    employee: userId, 
                    month: payrollMonth,
                    ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
                },
                {
                    $set: {
                        gross: earnings,
                        deduction: deductions,
                        net: netPayable,
                        status: "Processed",
                        companyId: companyId
                    }
                },
                { upsert: true, new: true }
            );
        }

        return res.status(200).json({
            success: true,
            data: settlement,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
