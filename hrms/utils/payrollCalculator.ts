/** @format */

import {
  classifyAttendanceDay,
  computeMonthlyLateAggregate,
  AttendanceDayStatus,
  AttendancePolicyLike,
  WorkingDayLike,
  DEFAULT_ATTENDANCE_POLICY,
} from "./attendanceStatus";
import { EARNING_FIELDS, DEDUCTION_FIELDS } from "../models/hrms/SalaryStructure";

const sumFields = (obj: Record<string, number>, fields: readonly string[]) =>
  fields.reduce((sum, field) => sum + (obj[field] || 0), 0);

export interface DailyBreakdownEntry {
  date: string;
  status: AttendanceDayStatus;
  lateByMinutes: number;
  workedHours: number;
  reason: string;
}

export interface PayrollBreakdown {
  userId: string;
  name: string;
  employeeId?: string;
  role: string;

  daysInMonth: number;
  fullDays: number;
  lateFullDays: number;
  halfDays: number;
  lateHalfDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  holidayDays: number;
  weeklyOffDays: number;
  daysNotYetOccurred: number;

  lateOccurrences: number;
  lateAggregateHalfDayDeductions: number;

  payableDays: number;
  lopDays: number;
  perDayRate: number;

  overtimeHours: number;
  overtimeAmount: number;
  encashmentBonus: number;

  fixedDeduction: number;
  lopDeduction: number;

  gross: number;
  deduction: number;
  net: number;

  dailyBreakdown: DailyBreakdownEntry[];
}

export interface ComputePayrollParams {
  employee: { _id: string; name: string; employeeId?: string; role: string };
  // All earning/deduction component fields on the SalaryStructure model
  // (EARNING_FIELDS / DEDUCTION_FIELDS in ../models/hrms/SalaryStructure) —
  // kept as a loose record here since the full component list can grow.
  salaryStructure: Record<string, number>;
  month: string; // YYYY-MM
  workingDay: WorkingDayLike | null;
  policy: AttendancePolicyLike | null;
  holidays: { date: Date; title: string }[];
  leaves: { fromDate: Date; toDate: Date; leaveType: string }[];
  attendanceRecords: {
    date: string;
    punchIn?: Date | null;
    punchOut?: Date | null;
    totalBreakSeconds?: number;
    totalWorkSeconds?: number;
  }[];
  leaveTypesByName: Map<string, boolean>;
  encashmentBonus?: number;
  now?: Date;
}

const toDateKey = (d: Date) => d.toISOString().split("T")[0];

function findApprovedLeaveForDate(
  leaves: { fromDate: Date; toDate: Date; leaveType: string }[],
  leaveTypesByName: Map<string, boolean>,
  dateStr: string
): { leaveType: string; paid: boolean } | null {
  const match = leaves.find(
    (l) => toDateKey(l.fromDate) <= dateStr && toDateKey(l.toDate) >= dateStr
  );
  if (!match) return null;
  return { leaveType: match.leaveType, paid: leaveTypesByName.get(match.leaveType) ?? false };
}

export function computeMonthlyPayrollForEmployee(params: ComputePayrollParams): PayrollBreakdown {
  const {
    employee,
    salaryStructure,
    month,
    workingDay,
    holidays,
    leaves,
    attendanceRecords,
    leaveTypesByName,
    encashmentBonus = 0,
  } = params;
  const policy = params.policy ?? DEFAULT_ATTENDANCE_POLICY;
  const now = params.now ?? new Date();

  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1; // 0-indexed
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const todayStr = now.toISOString().split("T")[0];

  const attendanceByDate = new Map(attendanceRecords.map((a) => [a.date, a]));
  const holidayByDate = new Map(holidays.map((h) => [toDateKey(h.date), h]));

  let fullDays = 0,
    lateFullDays = 0,
    halfDays = 0,
    lateHalfDays = 0,
    absentDays = 0,
    paidLeaveDays = 0,
    unpaidLeaveDays = 0,
    holidayDays = 0,
    weeklyOffDays = 0,
    daysNotYetOccurred = 0,
    overtimeHours = 0;

  const dailyBreakdown: DailyBreakdownEntry[] = [];
  const statusesForLateAggregate: AttendanceDayStatus[] = [];

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

    const classification = classifyAttendanceDay({
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
        if (leave?.paid) paidLeaveDays++;
        else unpaidLeaveDays++;
        break;
      case "HOLIDAY":
        holidayDays++;
        break;
      case "WEEKLY_OFF":
        weeklyOffDays++;
        break;
    }
  }

  const { lateOccurrences, aggregateHalfDayDeductions } = computeMonthlyLateAggregate(
    statusesForLateAggregate,
    policy.lateCountForHalfDay
  );

  const payableDays =
    fullDays +
    lateFullDays +
    0.5 * (halfDays + lateHalfDays) +
    paidLeaveDays +
    holidayDays +
    weeklyOffDays +
    daysNotYetOccurred -
    aggregateHalfDayDeductions;

  const lopDays = Math.max(0, daysInMonth - payableDays);

  const fullMonthlyGross = sumFields(salaryStructure, EARNING_FIELDS);
  const perDayRate = daysInMonth > 0 ? fullMonthlyGross / daysInMonth : 0;

  let overtimeAmount = 0;
  if (policy.overtimeEnabled && policy.overtimeType === "Paid" && overtimeHours > 0) {
    const perHourRate = perDayRate / (policy.minHoursFullDay || 8);
    const rate =
      policy.overtimeRateType === "FIXED_PER_HOUR"
        ? policy.overtimeRateValue
        : perHourRate * policy.overtimeRateValue;
    overtimeAmount = Math.round(overtimeHours * rate);
  }

  const fixedDeduction = sumFields(salaryStructure, DEDUCTION_FIELDS);
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
