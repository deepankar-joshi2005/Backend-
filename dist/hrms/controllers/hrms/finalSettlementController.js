"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettlementStatus = exports.getInactiveUsersSettlements = void 0;
const User_1 = __importDefault(require("../../models/User"));
const FinalSettlement_1 = __importDefault(require("../../models/hrms/FinalSettlement"));
const SalaryStructure_1 = __importDefault(require("../../models/hrms/SalaryStructure"));
const Payroll_1 = __importDefault(require("../../models/hrms/Payroll"));
const ResignationRequest_1 = __importDefault(require("../../models/hrms/ResignationRequest"));
const Attendance_1 = __importDefault(require("../../models/hrms/Attendance"));
const constants_1 = require("../../constants");
/**
 * Helper to format date as YYYY-MM-DD in local time
 */
const formatDateLocal = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
/**
 * Get all inactive users and their settlement details with automated calculation
 */
const getInactiveUsersSettlements = async (req, res) => {
    try {
        const { companyId, role } = req.user;
        const { page = "1", limit = "15", search = "" } = req.query;
        const pageNum = Math.max(Number(page), 1);
        const limitNum = Math.max(Number(limit), 1);
        const skip = (pageNum - 1) * limitNum;
        // Find all users with status "INACTIVE" - Tenant Isolated
        const userFilter = { status: "INACTIVE" };
        if (role !== constants_1.ROLES.HRMSAdmin) {
            userFilter.companyId = companyId;
        }
        if (search) {
            userFilter.$or = [
                { name: { $regex: search, $options: "i" } },
                { employeeId: { $regex: search, $options: "i" } },
            ];
        }
        const totalRecords = await User_1.default.countDocuments(userFilter);
        const inactiveUsers = await User_1.default.find(userFilter)
            .populate("departmentId", "name")
            .populate("designationId", "name")
            .skip(skip)
            .limit(limitNum)
            .lean();
        console.log(`[F&F DEBUG] Found ${inactiveUsers.length} inactive users for company ${companyId}`);
        // Fetch existing settlement records - Tenant Isolated
        const settlementFilter = {
            userId: { $in: inactiveUsers.map((u) => u._id) }
        };
        if (role !== constants_1.ROLES.HRMSAdmin) {
            settlementFilter.companyId = companyId;
        }
        const settlements = await FinalSettlement_1.default.find(settlementFilter).lean();
        // Map settlement status to users with calculations
        const result = await Promise.all(inactiveUsers.map(async (user) => {
            const settlement = settlements.find((s) => s.userId.toString() === user._id.toString());
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
                const resignation = await ResignationRequest_1.default.findOne({
                    employee: user._id,
                    status: "APPROVED",
                    ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
                }).sort({ createdAt: -1 });
                const lastWorkingDay = resignation ? resignation.expectedLastWorkingDay : null;
                // 2. Get Salary Structure - Tenant Isolated
                const salary = await SalaryStructure_1.default.findOne({
                    employee: user._id,
                    ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
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
                    const lastMonthAttendance = await Attendance_1.default.countDocuments({
                        user: user._id,
                        date: { $gte: firstDayOfLastMonthStr, $lte: lastDayOfLastMonthStr },
                        status: "PRESENT",
                        ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
                    });
                    calculatedDetails.lastMonthSalary = Math.round(lastMonthAttendance * perDayGross);
                    calculatedDetails.lastWorkingDay = lastWorkingDay;
                    // 4. Calculate Unpaid Salary (Attendance Based) - Tenant Isolated
                    const lastPayroll = await Payroll_1.default.findOne({
                        employee: user._id,
                        status: "Paid",
                        ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
                    }).sort({ month: -1 });
                    let unpaidTotal = 0;
                    let checkDate;
                    if (lastPayroll) {
                        const [year, month] = lastPayroll.month.split("-").map(Number);
                        checkDate = new Date(year, month, 1);
                    }
                    else {
                        const joinDate = new Date(user.joiningDate);
                        checkDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
                    }
                    const resignationMonthStart = new Date(lwd.getFullYear(), lwd.getMonth(), 1);
                    while (checkDate < resignationMonthStart) {
                        const y = checkDate.getFullYear();
                        const m = checkDate.getMonth();
                        const firstDay = formatDateLocal(new Date(y, m, 1));
                        const lastDay = formatDateLocal(new Date(y, m + 1, 0));
                        const presentDays = await Attendance_1.default.countDocuments({
                            user: user._id,
                            date: { $gte: firstDay, $lte: lastDay },
                            status: "PRESENT",
                            ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
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
    }
    catch (error) {
        console.error("F&F Calculation Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getInactiveUsersSettlements = getInactiveUsersSettlements;
/**
 * Update or create settlement record for a user
 */
const updateSettlementStatus = async (req, res) => {
    var _a;
    try {
        const { userId, status, earnings, deductions, notes, lastMonthSalary, unpaidSalary, leaveEncashment, bonus, lastWorkingDay } = req.body;
        if (!userId || !status) {
            return res.status(400).json({
                success: false,
                message: "User ID and status are required",
            });
        }
        const { companyId, role } = req.user;
        // Verify user belongs to same company
        const targetUser = await User_1.default.findById(userId);
        if (!targetUser)
            return res.status(404).json({ message: "User not found" });
        if (role !== constants_1.ROLES.HRMSAdmin && ((_a = targetUser.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== (companyId === null || companyId === void 0 ? void 0 : companyId.toString())) {
            return res.status(403).json({ message: "Access denied. User belongs to another company." });
        }
        const netPayable = (earnings || 0) - (deductions || 0);
        const settlement = await FinalSettlement_1.default.findOneAndUpdate({ userId }, {
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
        }, { new: true, upsert: true });
        // If status is FINAL, add to Payroll
        if (status === "FINAL") {
            const today = new Date();
            const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            // Check if payroll for current month is already paid - Tenant Isolated
            const paidPayroll = await Payroll_1.default.findOne({
                month: currentMonth,
                status: "Paid",
                ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
            });
            const payrollMonth = paidPayroll ?
                `${today.getFullYear()}-${String(today.getMonth() + 2).padStart(2, '0')}` :
                currentMonth;
            await Payroll_1.default.findOneAndUpdate({
                employee: userId,
                month: payrollMonth,
                ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
            }, {
                $set: {
                    gross: earnings,
                    deduction: deductions,
                    net: netPayable,
                    status: "Processed",
                    companyId: companyId
                }
            }, { upsert: true, new: true });
        }
        return res.status(200).json({
            success: true,
            data: settlement,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.updateSettlementStatus = updateSettlementStatus;
