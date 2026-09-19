"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayrollPreview = exports.recalculatePayroll = exports.rejectPayroll = exports.resetPayrollByMonth = exports.payAllPayroll = exports.updatePayrollStatus = exports.savePayroll = exports.getPayrollByMonth = void 0;
exports.buildPayrollBreakdownsForMonth = buildPayrollBreakdownsForMonth;
exports.runPayrollForMonth = runPayrollForMonth;
const Payroll_1 = __importDefault(require("../../models/hrms/Payroll"));
const PayrollRun_1 = __importDefault(require("../../models/hrms/PayrollRun"));
const constants_1 = require("../../constants");
const User_1 = __importDefault(require("../../models/User"));
const SalaryStructure_1 = __importDefault(require("../../models/hrms/SalaryStructure"));
const Attendance_1 = __importDefault(require("../../models/hrms/Attendance"));
const Holiday_1 = __importDefault(require("../../models/hrms/Holiday"));
const Leave_1 = __importDefault(require("../../models/hrms/Leave"));
const LeaveType_1 = __importDefault(require("../../models/hrms/LeaveType"));
const LeaveEncashment_1 = __importDefault(require("../../models/hrms/LeaveEncashment"));
const WorkingDay_1 = __importDefault(require("../../models/hrms/WorkingDay"));
const AttendancePolicy_1 = __importDefault(require("../../models/hrms/AttendancePolicy"));
const attendanceStatus_1 = require("../../utils/attendanceStatus");
const payrollCalculator_1 = require("../../utils/payrollCalculator");
const payrollRunHelpers_1 = require("../../utils/payrollRunHelpers");
/* =====================================================
   🧮 SHARED: build server-authoritative payroll breakdowns for a month
   Used identically by preview, run, and recalculate — single source of
   truth so none of them can ever disagree with each other.
===================================================== */
async function buildPayrollBreakdownsForMonth(req, month, filterUserIds) {
    const { companyId, role, isSystemAdmin } = req.user;
    const scoped = !isSystemAdmin && role !== constants_1.ROLES.HRMSAdmin;
    const userFilter = { status: "ACTIVE" };
    if (scoped)
        userFilter.companyId = companyId;
    if (filterUserIds === null || filterUserIds === void 0 ? void 0 : filterUserIds.length)
        userFilter._id = { $in: filterUserIds };
    const employees = await User_1.default.find(userFilter, "name employeeId role companyId").lean();
    if (!employees.length)
        return [];
    const employeeIds = employees.map((e) => e._id);
    const companyIds = Array.from(new Set(employees.map((e) => String(e.companyId))));
    const monthStart = new Date(`${month}-01`);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const lastDay = monthEnd.getDate();
    const dateStart = `${month}-01`;
    const dateEnd = `${month}-${String(lastDay).padStart(2, "0")}`;
    const [salaryStructures, workingDays, policies, holidays, leaves, leaveTypes, attendanceRecords, encashments,] = await Promise.all([
        SalaryStructure_1.default.find({ employee: { $in: employeeIds } }).lean(),
        WorkingDay_1.default.find({ companyId: { $in: companyIds } }),
        AttendancePolicy_1.default.find({ companyId: { $in: companyIds } }),
        Holiday_1.default.find({ companyId: { $in: companyIds }, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
        Leave_1.default.find({
            employee: { $in: employeeIds },
            status: "APPROVED",
            fromDate: { $lte: monthEnd },
            toDate: { $gte: monthStart },
        }).lean(),
        LeaveType_1.default.find({}).lean(),
        Attendance_1.default.find({ user: { $in: employeeIds }, date: { $gte: dateStart, $lte: dateEnd } }).lean(),
        LeaveEncashment_1.default.find({
            employee: { $in: employeeIds },
            status: "APPROVED",
            payrollMonth: month,
        }).lean(),
    ]);
    const salaryByEmployee = new Map(salaryStructures.map((s) => [String(s.employee), s]));
    const workingDayByCompany = new Map(workingDays.map((w) => [String(w.companyId), (0, attendanceStatus_1.toWorkingDayLike)(w)]));
    const policyByCompany = new Map(policies.map((p) => [String(p.companyId), (0, attendanceStatus_1.toPolicyLike)(p)]));
    const leaveTypesByName = new Map(leaveTypes.map((lt) => [lt.name, lt.paid]));
    const holidaysByCompany = new Map();
    for (const h of holidays) {
        const key = String(h.companyId);
        if (!holidaysByCompany.has(key))
            holidaysByCompany.set(key, []);
        holidaysByCompany.get(key).push(h);
    }
    const leavesByEmployee = new Map();
    for (const l of leaves) {
        const key = String(l.employee);
        if (!leavesByEmployee.has(key))
            leavesByEmployee.set(key, []);
        leavesByEmployee.get(key).push(l);
    }
    const attendanceByEmployee = new Map();
    for (const a of attendanceRecords) {
        const key = String(a.user);
        if (!attendanceByEmployee.has(key))
            attendanceByEmployee.set(key, []);
        attendanceByEmployee.get(key).push(a);
    }
    const encashmentBonusByEmployee = new Map();
    for (const e of encashments) {
        const key = String(e.employee);
        encashmentBonusByEmployee.set(key, (encashmentBonusByEmployee.get(key) || 0) + (Number(e.totalAmount) || 0));
    }
    const results = [];
    for (const emp of employees) {
        const salary = salaryByEmployee.get(String(emp._id));
        if (!salary)
            continue; // no salary structure configured yet — can't compute pay
        const companyIdStr = String(emp.companyId);
        const breakdown = (0, payrollCalculator_1.computeMonthlyPayrollForEmployee)({
            employee: { _id: String(emp._id), name: emp.name, employeeId: emp.employeeId, role: emp.role },
            salaryStructure: salary,
            month,
            workingDay: workingDayByCompany.get(companyIdStr) || null,
            policy: policyByCompany.get(companyIdStr) || null,
            holidays: holidaysByCompany.get(companyIdStr) || [],
            leaves: leavesByEmployee.get(String(emp._id)) || [],
            attendanceRecords: attendanceByEmployee.get(String(emp._id)) || [],
            leaveTypesByName,
            encashmentBonus: encashmentBonusByEmployee.get(String(emp._id)) || 0,
        });
        results.push({ breakdown, companyId: emp.companyId });
    }
    return results;
}
/* ================= GET PAYROLL BY MONTH ================= */
const getPayrollByMonth = async (req, res) => {
    try {
        const { month } = req.query;
        if (!month) {
            return res.status(400).json({ message: "Month required" });
        }
        const filter = { month };
        // Multi-tenancy filtering
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        const payroll = await Payroll_1.default.find(filter)
            .populate("employee", "name email role employeeId")
            .sort({ createdAt: -1 });
        res.json(payroll);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch payroll" });
    }
};
exports.getPayrollByMonth = getPayrollByMonth;
/* ================= SHARED: compute + persist payroll for a month =================
   Used by both the legacy /payroll/run endpoint and the new
   /payroll/runs/:month/run endpoint, so the two can never disagree. */
async function runPayrollForMonth(req, month) {
    const results = await buildPayrollBreakdownsForMonth(req, month);
    if (!results.length) {
        throw new Error("No employees with a salary structure found for this month");
    }
    const bulkOps = results.map(({ breakdown, companyId }) => ({
        updateOne: {
            filter: { employee: breakdown.userId, month },
            update: {
                $set: {
                    gross: breakdown.gross,
                    deduction: breakdown.deduction,
                    net: breakdown.net,
                    payDays: breakdown.payableDays,
                    lopDays: breakdown.lopDays,
                    status: "Processed",
                    companyId,
                    fullDays: breakdown.fullDays,
                    lateFullDays: breakdown.lateFullDays,
                    halfDays: breakdown.halfDays,
                    lateHalfDays: breakdown.lateHalfDays,
                    absentDays: breakdown.absentDays,
                    paidLeaveDays: breakdown.paidLeaveDays,
                    unpaidLeaveDays: breakdown.unpaidLeaveDays,
                    holidayDays: breakdown.holidayDays,
                    weeklyOffDays: breakdown.weeklyOffDays,
                    lateOccurrences: breakdown.lateOccurrences,
                    lateAggregateHalfDayDeductions: breakdown.lateAggregateHalfDayDeductions,
                    perDayRate: breakdown.perDayRate,
                    overtimeHours: breakdown.overtimeHours,
                    overtimeAmount: breakdown.overtimeAmount,
                    encashmentBonus: breakdown.encashmentBonus,
                    fixedDeductionAmount: breakdown.fixedDeduction,
                    lopDeductionAmount: breakdown.lopDeduction,
                    dailyBreakdown: breakdown.dailyBreakdown,
                },
            },
            upsert: true,
        },
    }));
    await Payroll_1.default.bulkWrite(bulkOps);
    return results.length;
}
/* ================= SAVE / UPDATE PAYROLL (RUN PAYROLL) =================
   Server-authoritative: recomputes every employee's payroll from
   attendance + policy + salary structure. The client can no longer post
   trusted final numbers — it only tells us which month to run. */
const savePayroll = async (req, res) => {
    try {
        const { month } = req.body;
        if (!month) {
            return res.status(400).json({ message: "Month required" });
        }
        await runPayrollForMonth(req, month);
        res.json({ message: "Payroll processed successfully" });
    }
    catch (error) {
        console.error(error);
        if (error.message === "No employees with a salary structure found for this month") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to save payroll" });
    }
};
exports.savePayroll = savePayroll;
/* ================= UPDATE STATUS (Paid) ================= */
const updatePayrollStatus = async (req, res) => {
    var _a, _b;
    try {
        const { status } = req.body;
        const existingPayroll = await Payroll_1.default.findById(req.params.id);
        if (!existingPayroll) {
            return res.status(404).json({ message: "Payroll not found" });
        }
        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = existingPayroll.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        const payroll = await Payroll_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate("employee", "name email role");
        if (!payroll) {
            return res.status(404).json({ message: "Payroll not found" });
        }
        res.json(payroll);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update payroll status" });
    }
};
exports.updatePayrollStatus = updatePayrollStatus;
/* ================= PAY ALL (BULK) =================
   Marks every "Processed" payroll record for a month as "Paid" in one go,
   so Finance doesn't have to open each employee's row individually. */
const payAllPayroll = async (req, res) => {
    try {
        const { month } = req.body;
        if (!month) {
            return res.status(400).json({ message: "Month required" });
        }
        const filter = { month, status: "Processed" };
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        const result = await Payroll_1.default.updateMany(filter, { $set: { status: "Paid" } });
        // 🔥 If every employee for a company+month is now Paid, mark that run Completed.
        const scopeFilter = { month };
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            scopeFilter.companyId = req.user.companyId;
        }
        const companyIds = await Payroll_1.default.distinct("companyId", scopeFilter);
        const today = new Date().toISOString().slice(0, 10);
        for (const companyId of companyIds) {
            const remaining = await Payroll_1.default.countDocuments({ month, companyId, status: { $ne: "Paid" } });
            if (remaining > 0)
                continue;
            const run = await PayrollRun_1.default.findOne({ companyId, month });
            if (run) {
                run.status = "Completed";
                if (!run.payDate)
                    run.payDate = today;
                await run.save();
            }
            else {
                const { start, end } = (0, payrollRunHelpers_1.monthBounds)(month);
                await PayrollRun_1.default.create({
                    companyId,
                    month,
                    title: (0, payrollRunHelpers_1.defaultRunTitle)(month),
                    frequency: "Monthly",
                    payPeriodStart: start,
                    payPeriodEnd: end,
                    payDate: today,
                    status: "Completed",
                });
            }
        }
        res.json({
            message: `${result.modifiedCount} payroll record(s) marked as Paid`,
            modifiedCount: result.modifiedCount,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to pay all payroll" });
    }
};
exports.payAllPayroll = payAllPayroll;
/* ================= RESET PAYROLL BY MONTH (DEV / ADMIN) ================= */
const resetPayrollByMonth = async (req, res) => {
    try {
        const { month } = req.query;
        if (!month) {
            return res.status(400).json({ message: "Month required" });
        }
        // ❌ Paid payroll delete nahi hone chahiye
        const paidFilter = { month, status: "Paid" };
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            paidFilter.companyId = req.user.companyId;
        }
        const paidExists = await Payroll_1.default.findOne(paidFilter);
        if (paidExists) {
            return res.status(400).json({
                message: "Cannot reset payroll. Some salaries are already paid.",
            });
        }
        const deleteFilter = { month };
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            deleteFilter.companyId = req.user.companyId;
        }
        await Payroll_1.default.deleteMany(deleteFilter);
        res.json({
            message: `Payroll reset successfully for ${month}`,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to reset payroll" });
    }
};
exports.resetPayrollByMonth = resetPayrollByMonth;
// PATCH /payroll/:id/reject
const rejectPayroll = async (req, res) => {
    var _a, _b;
    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ message: "Rejection reason required" });
    }
    const payroll = await Payroll_1.default.findById(req.params.id);
    if (!payroll) {
        return res.status(404).json({ message: "Payroll not found" });
    }
    // Access check
    if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = payroll.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
        return res.status(403).json({ message: "Access denied." });
    }
    payroll.status = "Rejected";
    payroll.rejectReason = reason;
    payroll.rejectedAt = new Date();
    await payroll.save();
    res.json(payroll);
};
exports.rejectPayroll = rejectPayroll;
/* ================= RECALCULATE REJECTED PAYROLL =================
   Also server-authoritative now — recomputes this one employee's payroll
   from current attendance/policy data rather than trusting client numbers. */
const recalculatePayroll = async (req, res) => {
    try {
        const { payrollId } = req.body;
        if (!payrollId) {
            return res.status(400).json({ message: "PayrollId required" });
        }
        const payroll = await Payroll_1.default.findById(payrollId);
        if (!payroll) {
            return res.status(404).json({ message: "Payroll not found" });
        }
        // 🔒 SAFETY CHECKS
        if (payroll.status === "Paid") {
            return res
                .status(400)
                .json({ message: "Paid payroll cannot be recalculated" });
        }
        if (payroll.status !== "Rejected") {
            return res
                .status(400)
                .json({ message: "Only rejected payroll can be recalculated" });
        }
        const results = await buildPayrollBreakdownsForMonth(req, payroll.month, [
            payroll.employee.toString(),
        ]);
        const result = results[0];
        if (!result) {
            return res.status(400).json({ message: "Unable to recompute payroll for this employee" });
        }
        const { breakdown } = result;
        payroll.gross = breakdown.gross;
        payroll.deduction = breakdown.deduction;
        payroll.net = breakdown.net;
        payroll.payDays = breakdown.payableDays;
        payroll.lopDays = breakdown.lopDays;
        payroll.fullDays = breakdown.fullDays;
        payroll.lateFullDays = breakdown.lateFullDays;
        payroll.halfDays = breakdown.halfDays;
        payroll.lateHalfDays = breakdown.lateHalfDays;
        payroll.absentDays = breakdown.absentDays;
        payroll.paidLeaveDays = breakdown.paidLeaveDays;
        payroll.unpaidLeaveDays = breakdown.unpaidLeaveDays;
        payroll.holidayDays = breakdown.holidayDays;
        payroll.weeklyOffDays = breakdown.weeklyOffDays;
        payroll.lateOccurrences = breakdown.lateOccurrences;
        payroll.lateAggregateHalfDayDeductions = breakdown.lateAggregateHalfDayDeductions;
        payroll.perDayRate = breakdown.perDayRate;
        payroll.overtimeHours = breakdown.overtimeHours;
        payroll.overtimeAmount = breakdown.overtimeAmount;
        payroll.encashmentBonus = breakdown.encashmentBonus;
        payroll.fixedDeductionAmount = breakdown.fixedDeduction;
        payroll.lopDeductionAmount = breakdown.lopDeduction;
        payroll.dailyBreakdown = breakdown.dailyBreakdown;
        payroll.status = "Processed"; // 🔥 reset status
        payroll.rejectReason = undefined;
        payroll.rejectedAt = undefined;
        await payroll.save();
        res.json({
            message: "Payroll recalculated successfully",
            payroll,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to recalculate payroll" });
    }
};
exports.recalculatePayroll = recalculatePayroll;
/* ================= GET PAYROLL PREVIEW =================
   Same server-authoritative calculation as "Run Payroll", just not
   persisted — lets HR/Admin review the full breakdown before committing. */
const getPayrollPreview = async (req, res) => {
    try {
        const { month } = req.query;
        if (!month)
            return res.status(400).json({ message: "Month required" });
        const results = await buildPayrollBreakdownsForMonth(req, month);
        res.json(results.map((r) => ({ ...r.breakdown, status: "Draft" })));
    }
    catch (error) {
        console.error("Payroll Preview Error:", error);
        res.status(500).json({ message: "Failed to generate payroll preview" });
    }
};
exports.getPayrollPreview = getPayrollPreview;
