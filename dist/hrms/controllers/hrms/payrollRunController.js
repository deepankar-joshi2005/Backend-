"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelPayrollRunForMonth = exports.runPayrollRunForMonth = exports.updatePayrollRunSchedule = exports.getPayrollRunDetail = exports.listPayrollRuns = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Payroll_1 = __importDefault(require("../../models/hrms/Payroll"));
const PayrollRun_1 = __importDefault(require("../../models/hrms/PayrollRun"));
const SalaryStructure_1 = __importDefault(require("../../models/hrms/SalaryStructure"));
const User_1 = __importDefault(require("../../models/User"));
const constants_1 = require("../../constants");
const payrollRunHelpers_1 = require("../../utils/payrollRunHelpers");
const payrollController_1 = require("./payrollController");
const isScoped = (req) => !req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin;
async function relevantCompanyIds(req) {
    if (isScoped(req))
        return [String(req.user.companyId)];
    const ids = await User_1.default.distinct("companyId", { status: "ACTIVE" });
    return ids.map((id) => String(id));
}
async function ensureRunDoc(companyId, month, statusIfNew = "Draft") {
    let run = await PayrollRun_1.default.findOne({ companyId, month });
    if (!run) {
        const { start, end } = (0, payrollRunHelpers_1.monthBounds)(month);
        run = await PayrollRun_1.default.create({
            companyId,
            month,
            title: (0, payrollRunHelpers_1.defaultRunTitle)(month),
            frequency: "Monthly",
            payPeriodStart: start,
            payPeriodEnd: end,
            status: statusIfNew,
        });
    }
    return run;
}
/* ================= LIST PAYROLL RUNS ================= */
const listPayrollRuns = async (req, res) => {
    try {
        const scoped = isScoped(req);
        const currentMonth = new Date().toISOString().slice(0, 7);
        const companyIds = await relevantCompanyIds(req);
        await Promise.all(companyIds.map((cid) => ensureRunDoc(cid, currentMonth, "Draft")));
        // Backfill: any company+month with Payroll data but no run doc yet (pre-existing history)
        const payrollScope = {};
        if (scoped)
            payrollScope.companyId = req.user.companyId;
        const monthCompanyPairs = await Payroll_1.default.aggregate([
            { $match: payrollScope },
            { $group: { _id: { month: "$month", companyId: "$companyId" } } },
        ]);
        for (const pair of monthCompanyPairs) {
            const { month, companyId } = pair._id;
            const exists = await PayrollRun_1.default.findOne({ companyId, month });
            if (exists)
                continue;
            const remaining = await Payroll_1.default.countDocuments({ month, companyId, status: { $ne: "Paid" } });
            const { start, end } = (0, payrollRunHelpers_1.monthBounds)(month);
            await PayrollRun_1.default.create({
                companyId,
                month,
                title: (0, payrollRunHelpers_1.defaultRunTitle)(month),
                frequency: "Monthly",
                payPeriodStart: start,
                payPeriodEnd: end,
                status: remaining === 0 ? "Completed" : "Processing",
            });
        }
        const runFilter = {};
        if (scoped)
            runFilter.companyId = req.user.companyId;
        const runs = await PayrollRun_1.default.find(runFilter).sort({ month: -1 }).lean();
        const summaryMatch = {};
        if (scoped)
            summaryMatch.companyId = new mongoose_1.default.Types.ObjectId(req.user.companyId);
        const summaries = await Payroll_1.default.aggregate([
            { $match: summaryMatch },
            {
                $group: {
                    _id: { month: "$month", companyId: "$companyId" },
                    employees: { $sum: 1 },
                    gross: { $sum: "$gross" },
                    deduction: { $sum: "$deduction" },
                    net: { $sum: "$net" },
                },
            },
        ]);
        const summaryMap = new Map(summaries.map((s) => [`${s._id.month}_${String(s._id.companyId)}`, s]));
        // Draft runs have no persisted Payroll rows yet (nothing has been "Run" for them).
        // Instead of showing 0/0/0, compute a live, unsaved preview from attendance-to-date
        // — the same engine the old preview screen used — so HR can see what's accruing
        // this month before actually running payroll.
        const draftMonths = Array.from(new Set(runs.filter((r) => r.status === "Draft").map((r) => r.month)));
        const previewByKey = new Map();
        for (const draftMonth of draftMonths) {
            const results = await (0, payrollController_1.buildPayrollBreakdownsForMonth)(req, draftMonth);
            for (const run of runs) {
                if (run.status !== "Draft" || run.month !== draftMonth)
                    continue;
                const forThisCompany = results.filter((r) => String(r.companyId) === String(run.companyId));
                previewByKey.set(`${run.month}_${String(run.companyId)}`, {
                    employees: forThisCompany.length,
                    gross: forThisCompany.reduce((s, r) => s + r.breakdown.gross, 0),
                    deduction: forThisCompany.reduce((s, r) => s + r.breakdown.deduction, 0),
                    net: forThisCompany.reduce((s, r) => s + r.breakdown.net, 0),
                });
            }
        }
        const payload = runs.map((run) => {
            const key = `${run.month}_${String(run.companyId)}`;
            if (run.status === "Draft") {
                const preview = previewByKey.get(key) || { employees: 0, gross: 0, deduction: 0, net: 0 };
                return { ...run, ...preview, isLivePreview: true };
            }
            const summary = summaryMap.get(key);
            return {
                ...run,
                employees: (summary === null || summary === void 0 ? void 0 : summary.employees) || 0,
                gross: (summary === null || summary === void 0 ? void 0 : summary.gross) || 0,
                deduction: (summary === null || summary === void 0 ? void 0 : summary.deduction) || 0,
                net: (summary === null || summary === void 0 ? void 0 : summary.net) || 0,
            };
        });
        res.json(payload);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch payroll runs" });
    }
};
exports.listPayrollRuns = listPayrollRuns;
/* ================= GET PAYROLL RUN DETAIL ================= */
const getPayrollRunDetail = async (req, res) => {
    try {
        const { month } = req.params;
        const scoped = isScoped(req);
        const runFilter = { month };
        if (scoped)
            runFilter.companyId = req.user.companyId;
        const run = await PayrollRun_1.default.findOne(runFilter).lean();
        if (!run) {
            return res.status(404).json({ message: "Payroll run not found for this month" });
        }
        const isLivePreview = run.status === "Draft";
        let entries;
        if (isLivePreview) {
            // Nothing has been "Run" for this month yet — compute a live, unsaved preview
            // from attendance-to-date (same engine as /payroll/preview) instead of reading
            // the (still empty) Payroll collection.
            const results = await (0, payrollController_1.buildPayrollBreakdownsForMonth)(req, month);
            const forThisCompany = results.filter((r) => String(r.companyId) === String(run.companyId));
            const employeeIds = forThisCompany.map((r) => r.breakdown.userId);
            const salaryStructures = await SalaryStructure_1.default.find({ employee: { $in: employeeIds } }).lean();
            const salaryByEmployee = new Map(salaryStructures.map((s) => [String(s.employee), s]));
            entries = forThisCompany.map(({ breakdown }) => {
                const salary = salaryByEmployee.get(String(breakdown.userId));
                return {
                    payrollId: `preview-${breakdown.userId}`,
                    employeeId: breakdown.userId,
                    name: breakdown.name,
                    employeeCode: breakdown.employeeId,
                    status: "Draft",
                    basic: (salary === null || salary === void 0 ? void 0 : salary.basic) || 0,
                    hra: (salary === null || salary === void 0 ? void 0 : salary.hra) || 0,
                    otherAllowance: (salary === null || salary === void 0 ? void 0 : salary.otherAllowance) || 0,
                    gross: breakdown.gross,
                    deduction: breakdown.deduction,
                    net: breakdown.net,
                    payDays: breakdown.payableDays,
                    lopDays: breakdown.lopDays,
                    fullDays: breakdown.fullDays,
                    lateFullDays: breakdown.lateFullDays,
                    halfDays: breakdown.halfDays,
                    lateHalfDays: breakdown.lateHalfDays,
                    absentDays: breakdown.absentDays,
                    paidLeaveDays: breakdown.paidLeaveDays,
                    unpaidLeaveDays: breakdown.unpaidLeaveDays,
                    holidayDays: breakdown.holidayDays,
                    weeklyOffDays: breakdown.weeklyOffDays,
                    perDayRate: breakdown.perDayRate,
                    overtimeHours: breakdown.overtimeHours,
                    overtimeAmount: breakdown.overtimeAmount,
                    encashmentBonus: breakdown.encashmentBonus,
                    fixedDeductionAmount: breakdown.fixedDeduction,
                    lopDeductionAmount: breakdown.lopDeduction,
                };
            });
        }
        else {
            const payrolls = await Payroll_1.default.find({ month, companyId: run.companyId })
                .populate("employee", "name email employeeId role")
                .sort({ createdAt: -1 })
                .lean();
            const employeeIds = payrolls.map((p) => { var _a; return (_a = p.employee) === null || _a === void 0 ? void 0 : _a._id; }).filter(Boolean);
            const salaryStructures = await SalaryStructure_1.default.find({ employee: { $in: employeeIds } }).lean();
            const salaryByEmployee = new Map(salaryStructures.map((s) => [String(s.employee), s]));
            entries = payrolls
                .filter((p) => p.employee)
                .map((p) => {
                const salary = salaryByEmployee.get(String(p.employee._id));
                return {
                    payrollId: p._id,
                    employeeId: p.employee._id,
                    name: p.employee.name,
                    employeeCode: p.employee.employeeId,
                    status: p.status,
                    basic: (salary === null || salary === void 0 ? void 0 : salary.basic) || 0,
                    hra: (salary === null || salary === void 0 ? void 0 : salary.hra) || 0,
                    otherAllowance: (salary === null || salary === void 0 ? void 0 : salary.otherAllowance) || 0,
                    gross: p.gross,
                    deduction: p.deduction,
                    net: p.net,
                    payDays: p.payDays,
                    lopDays: p.lopDays,
                    fullDays: p.fullDays,
                    lateFullDays: p.lateFullDays,
                    halfDays: p.halfDays,
                    lateHalfDays: p.lateHalfDays,
                    absentDays: p.absentDays,
                    paidLeaveDays: p.paidLeaveDays,
                    unpaidLeaveDays: p.unpaidLeaveDays,
                    holidayDays: p.holidayDays,
                    weeklyOffDays: p.weeklyOffDays,
                    perDayRate: p.perDayRate,
                    overtimeHours: p.overtimeHours,
                    overtimeAmount: p.overtimeAmount,
                    encashmentBonus: p.encashmentBonus,
                    fixedDeductionAmount: p.fixedDeductionAmount,
                    lopDeductionAmount: p.lopDeductionAmount,
                };
            });
        }
        const summary = entries.reduce((acc, e) => ({
            employees: acc.employees + 1,
            gross: acc.gross + (e.gross || 0),
            deduction: acc.deduction + (e.deduction || 0),
            net: acc.net + (e.net || 0),
        }), { employees: 0, gross: 0, deduction: 0, net: 0 });
        res.json({ run, summary, entries, isLivePreview });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch payroll run detail" });
    }
};
exports.getPayrollRunDetail = getPayrollRunDetail;
/* ================= UPDATE PAY PERIOD / PAY DATE ================= */
const updatePayrollRunSchedule = async (req, res) => {
    try {
        const { month } = req.params;
        const { payPeriodStart, payPeriodEnd, payDate } = req.body;
        const scoped = isScoped(req);
        const filter = { month };
        if (scoped)
            filter.companyId = req.user.companyId;
        const run = await PayrollRun_1.default.findOne(filter);
        if (!run) {
            return res.status(404).json({ message: "Payroll run not found for this month" });
        }
        const nextStart = payPeriodStart || run.payPeriodStart;
        const nextEnd = payPeriodEnd || run.payPeriodEnd;
        if (nextStart > nextEnd) {
            return res.status(400).json({ message: "Pay period start must be on or before the end date" });
        }
        if (payPeriodStart)
            run.payPeriodStart = payPeriodStart;
        if (payPeriodEnd)
            run.payPeriodEnd = payPeriodEnd;
        if (payDate !== undefined)
            run.payDate = payDate || undefined;
        await run.save();
        res.json(run);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update payroll run schedule" });
    }
};
exports.updatePayrollRunSchedule = updatePayrollRunSchedule;
/* ================= RUN PAYROLL FOR A MONTH ================= */
const runPayrollRunForMonth = async (req, res) => {
    try {
        const { month } = req.params;
        await (0, payrollController_1.runPayrollForMonth)(req, month);
        const scoped = isScoped(req);
        const scopeFilter = { month };
        if (scoped)
            scopeFilter.companyId = req.user.companyId;
        const companyIds = await Payroll_1.default.distinct("companyId", scopeFilter);
        for (const companyId of companyIds) {
            const run = await ensureRunDoc(String(companyId), month, "Processing");
            if (run.status !== "Processing") {
                run.status = "Processing";
                await run.save();
            }
        }
        res.json({ message: "Payroll processed successfully" });
    }
    catch (error) {
        console.error(error);
        if (error.message === "No employees with a salary structure found for this month") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to run payroll" });
    }
};
exports.runPayrollRunForMonth = runPayrollRunForMonth;
/* ================= CANCEL PAYROLL RUN ================= */
const cancelPayrollRunForMonth = async (req, res) => {
    try {
        const { month } = req.params;
        const scoped = isScoped(req);
        const filter = { month };
        if (scoped)
            filter.companyId = req.user.companyId;
        const run = await PayrollRun_1.default.findOne(filter);
        if (!run) {
            return res.status(404).json({ message: "Payroll run not found for this month" });
        }
        if (run.status === "Completed") {
            return res.status(400).json({ message: "Cannot cancel a completed payroll run." });
        }
        const paidExists = await Payroll_1.default.findOne({ month, companyId: run.companyId, status: "Paid" });
        if (paidExists) {
            return res.status(400).json({ message: "Cannot cancel. Some salaries are already paid." });
        }
        await Payroll_1.default.deleteMany({ month, companyId: run.companyId });
        run.status = "Cancelled";
        await run.save();
        res.json({ message: `Payroll run cancelled for ${month}` });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to cancel payroll run" });
    }
};
exports.cancelPayrollRunForMonth = cancelPayrollRunForMonth;
