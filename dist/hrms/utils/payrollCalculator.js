"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeMonthlyPayrollForEmployee = computeMonthlyPayrollForEmployee;
const attendanceStatus_1 = require("./attendanceStatus");
const toDateKey = (d) => d.toISOString().split("T")[0];
function findApprovedLeaveForDate(leaves, leaveTypesByName, dateStr) {
    var _a;
    const match = leaves.find((l) => toDateKey(l.fromDate) <= dateStr && toDateKey(l.toDate) >= dateStr);
    if (!match)
        return null;
    return { leaveType: match.leaveType, paid: (_a = leaveTypesByName.get(match.leaveType)) !== null && _a !== void 0 ? _a : false };
}
function computeMonthlyPayrollForEmployee(params) {
    var _a, _b;
    const { employee, salaryStructure, month, workingDay, holidays, leaves, attendanceRecords, leaveTypesByName, encashmentBonus = 0, } = params;
    const policy = (_a = params.policy) !== null && _a !== void 0 ? _a : attendanceStatus_1.DEFAULT_ATTENDANCE_POLICY;
    const now = (_b = params.now) !== null && _b !== void 0 ? _b : new Date();
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1; // 0-indexed
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const todayStr = now.toISOString().split("T")[0];
    const attendanceByDate = new Map(attendanceRecords.map((a) => [a.date, a]));
    const holidayByDate = new Map(holidays.map((h) => [toDateKey(h.date), h]));
    let fullDays = 0, lateFullDays = 0, halfDays = 0, lateHalfDays = 0, absentDays = 0, paidLeaveDays = 0, unpaidLeaveDays = 0, holidayDays = 0, weeklyOffDays = 0, daysNotYetOccurred = 0, overtimeHours = 0;
    const dailyBreakdown = [];
    const statusesForLateAggregate = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
        // Today and future days haven't fully happened yet — don't penalize pay for them.
        if (dateStr >= todayStr) {
            daysNotYetOccurred++;
            continue;
        }
        const record = attendanceByDate.get(dateStr) || null;
        const holiday = holidayByDate.get(dateStr) || null;
        const leave = findApprovedLeaveForDate(leaves, leaveTypesByName, dateStr);
        const classification = (0, attendanceStatus_1.classifyAttendanceDay)({
            date: dateStr,
            attendance: record
                ? {
                    punchIn: record.punchIn,
                    punchOut: record.punchOut,
                    totalBreakSeconds: record.totalBreakSeconds,
                    totalWorkSeconds: record.totalWorkSeconds,
                }
                : null,
            workingDay,
            policy,
            holiday: holiday ? { title: holiday.title } : null,
            leave,
            now,
        });
        statusesForLateAggregate.push(classification.status);
        dailyBreakdown.push({
            date: dateStr,
            status: classification.status,
            lateByMinutes: classification.lateByMinutes,
            workedHours: classification.workedHours,
            reason: classification.reason,
        });
        overtimeHours += classification.overtimeHours;
        switch (classification.status) {
            case "FULL_DAY":
                fullDays++;
                break;
            case "LATE_FULL_DAY":
                lateFullDays++;
                break;
            case "HALF_DAY":
                halfDays++;
                break;
            case "LATE_HALF_DAY":
                lateHalfDays++;
                break;
            case "ABSENT":
                absentDays++;
                break;
            case "ON_LEAVE":
                if (leave === null || leave === void 0 ? void 0 : leave.paid)
                    paidLeaveDays++;
                else
                    unpaidLeaveDays++;
                break;
            case "HOLIDAY":
                holidayDays++;
                break;
            case "WEEKLY_OFF":
                weeklyOffDays++;
                break;
        }
    }
    const { lateOccurrences, aggregateHalfDayDeductions } = (0, attendanceStatus_1.computeMonthlyLateAggregate)(statusesForLateAggregate, policy.lateCountForHalfDay);
    const payableDays = fullDays +
        lateFullDays +
        0.5 * (halfDays + lateHalfDays) +
        paidLeaveDays +
        holidayDays +
        weeklyOffDays +
        daysNotYetOccurred -
        aggregateHalfDayDeductions;
    const lopDays = Math.max(0, daysInMonth - payableDays);
    const fullMonthlyGross = (salaryStructure.basic || 0) + (salaryStructure.hra || 0) + (salaryStructure.otherAllowance || 0);
    const perDayRate = daysInMonth > 0 ? fullMonthlyGross / daysInMonth : 0;
    let overtimeAmount = 0;
    if (policy.overtimeEnabled && policy.overtimeType === "Paid" && overtimeHours > 0) {
        const perHourRate = perDayRate / (policy.minHoursFullDay || 8);
        const rate = policy.overtimeRateType === "FIXED_PER_HOUR"
            ? policy.overtimeRateValue
            : perHourRate * policy.overtimeRateValue;
        overtimeAmount = Math.round(overtimeHours * rate);
    }
    const fixedDeduction = (salaryStructure.pf || 0) +
        (salaryStructure.professionalTax || 0) +
        (salaryStructure.tds || 0) +
        (salaryStructure.others || 0);
    const lopDeduction = Math.round(perDayRate * lopDays);
    const gross = Math.round(fullMonthlyGross + encashmentBonus + overtimeAmount);
    const deduction = Math.round(fixedDeduction + lopDeduction);
    const net = Math.max(0, gross - deduction);
    return {
        userId: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        role: employee.role,
        daysInMonth,
        fullDays,
        lateFullDays,
        halfDays,
        lateHalfDays,
        absentDays,
        paidLeaveDays,
        unpaidLeaveDays,
        holidayDays,
        weeklyOffDays,
        daysNotYetOccurred,
        lateOccurrences,
        lateAggregateHalfDayDeductions: aggregateHalfDayDeductions,
        payableDays: Math.round(payableDays * 100) / 100,
        lopDays: Math.round(lopDays * 100) / 100,
        perDayRate: Math.round(perDayRate * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        overtimeAmount,
        encashmentBonus,
        fixedDeduction,
        lopDeduction,
        gross,
        deduction,
        net,
        dailyBreakdown,
    };
}
