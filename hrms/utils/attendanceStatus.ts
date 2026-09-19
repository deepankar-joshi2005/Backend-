/** @format */

import { parseTimeStringToMinutes } from "./timeParser";

export type AttendanceDayStatus =
  | "FULL_DAY"
  | "LATE_FULL_DAY"
  | "HALF_DAY"
  | "LATE_HALF_DAY"
  | "ABSENT"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKLY_OFF";

export type WeeklyOffValue = "Working" | "Half Day" | "OFF";

export interface WorkingDayLike {
  weeklyOff: {
    monday: WeeklyOffValue;
    tuesday: WeeklyOffValue;
    wednesday: WeeklyOffValue;
    thursday: WeeklyOffValue;
    friday: WeeklyOffValue;
    saturday: WeeklyOffValue;
    sunday: WeeklyOffValue;
  };
  officeTiming: {
    startTime: string;
    endTime: string;
    breakTime: string;
  };
}

export interface AttendancePolicyLike {
  graceMinutes: number;
  lateMarkAfterMinutes: number;
  minHoursFullDay: number;
  minHoursHalfDay: number;
  earlyExitBufferMinutes: number;
  lateCountForHalfDay: number;
  overtimeEnabled: boolean;
  overtimeAfterHours: number;
  overtimeType: "Paid" | "Compensatory" | "None";
  overtimeRateType: "FIXED_PER_HOUR" | "MULTIPLIER_OF_HOURLY";
  overtimeRateValue: number;
}

export const DEFAULT_WORKING_DAY: WorkingDayLike = {
  weeklyOff: {
    monday: "Working",
    tuesday: "Working",
    wednesday: "Working",
    thursday: "Working",
    friday: "Working",
    saturday: "Half Day",
    sunday: "OFF",
  },
  officeTiming: {
    startTime: "09:30 AM",
    endTime: "06:30 PM",
    breakTime: "01:00 PM - 02:00 PM",
  },
};

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicyLike = {
  graceMinutes: 10,
  lateMarkAfterMinutes: 15,
  minHoursFullDay: 8,
  minHoursHalfDay: 4,
  earlyExitBufferMinutes: 30,
  lateCountForHalfDay: 3,
  overtimeEnabled: true,
  overtimeAfterHours: 8,
  overtimeType: "Paid",
  overtimeRateType: "MULTIPLIER_OF_HOURLY",
  overtimeRateValue: 1.5,
};

/** Converts a Mongoose WorkingDay doc (or null) into the plain shape the classifier expects. */
export const toWorkingDayLike = (wd: any): WorkingDayLike | null =>
  wd ? { weeklyOff: wd.weeklyOff, officeTiming: wd.officeTiming } : null;

/** Converts a Mongoose AttendancePolicy doc (or null) into the plain shape the classifier expects. */
export const toPolicyLike = (p: any): AttendancePolicyLike | null =>
  p
    ? {
        graceMinutes: p.graceMinutes,
        lateMarkAfterMinutes: p.lateMarkAfterMinutes,
        minHoursFullDay: p.minHoursFullDay,
        minHoursHalfDay: p.minHoursHalfDay,
        earlyExitBufferMinutes: p.earlyExitBufferMinutes,
        lateCountForHalfDay: p.lateCountForHalfDay,
        overtimeEnabled: p.overtimeEnabled,
        overtimeAfterHours: p.overtimeAfterHours,
        overtimeType: p.overtimeType,
        overtimeRateType: p.overtimeRateType,
        overtimeRateValue: p.overtimeRateValue,
      }
    : null;

const WEEKDAY_KEYS: (keyof WorkingDayLike["weeklyOff"])[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export interface ClassifyDayInput {
  date: string; // YYYY-MM-DD
  attendance: {
    punchIn?: Date | null;
    punchOut?: Date | null;
    totalBreakSeconds?: number;
    totalWorkSeconds?: number;
    // Anchor for a currently-open session started by re-punching in after an
    // earlier punch-out today. Falls back to `punchIn` when absent, which
    // keeps single-session days behaving exactly as before.
    currentSessionPunchIn?: Date | null;
    breaks?: { start: Date; end?: Date; duration?: number }[];
  } | null;
  workingDay: WorkingDayLike | null;
  policy: AttendancePolicyLike | null;
  holiday: { title: string } | null;
  leave: { leaveType: string; paid: boolean } | null;
  now?: Date;
}

export interface ClassifyDayResult {
  status: AttendanceDayStatus;
  isProvisional: boolean;
  workedHours: number;
  requiredHoursFullDay: number;
  requiredHoursHalfDay: number;
  isLate: boolean;
  lateByMinutes: number;
  earlyExitByMinutes: number;
  overtimeHours: number;
  reason: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function classifyAttendanceDay(input: ClassifyDayInput): ClassifyDayResult {
  const now = input.now ?? new Date();
  const workingDay = input.workingDay ?? DEFAULT_WORKING_DAY;
  const policy = input.policy ?? DEFAULT_ATTENDANCE_POLICY;

  const weekdayKey = WEEKDAY_KEYS[new Date(`${input.date}T00:00:00`).getDay()];
  const weeklyOffValue = workingDay.weeklyOff[weekdayKey];

  const base = {
    isProvisional: false,
    workedHours: 0,
    requiredHoursFullDay: policy.minHoursFullDay,
    requiredHoursHalfDay: policy.minHoursHalfDay,
    isLate: false,
    lateByMinutes: 0,
    earlyExitByMinutes: 0,
    overtimeHours: 0,
  };

  // 1. Holiday
  if (input.holiday) {
    return { ...base, status: "HOLIDAY", reason: `Holiday — ${input.holiday.title}` };
  }

  // 2. Weekly off
  if (weeklyOffValue === "OFF") {
    return { ...base, status: "WEEKLY_OFF", reason: "Weekly off" };
  }

  // 3. On leave
  if (input.leave) {
    return {
      ...base,
      status: "ON_LEAVE",
      reason: `On leave (${input.leave.leaveType}${input.leave.paid ? "" : ", unpaid"})`,
    };
  }

  // 4. No attendance record / never punched in => absent
  if (!input.attendance || !input.attendance.punchIn) {
    return { ...base, status: "ABSENT", reason: "No punch-in recorded" };
  }

  const { punchIn, punchOut, totalWorkSeconds = 0 } = input.attendance;
  const isToday = input.date === now.toISOString().split("T")[0];

  let workedHours: number;
  let isProvisional = false;
  let noPunchOutReason: string | null = null;

  if (punchOut) {
    workedHours = totalWorkSeconds / 3600;
  } else if (isToday) {
    // totalWorkSeconds already holds everything earned in sessions that were
    // closed earlier today (re-punch-in scenario) — only the currently-open
    // session's elapsed time (minus breaks taken during it) still needs adding.
    const sessionAnchor = input.attendance.currentSessionPunchIn ?? punchIn;
    const elapsedSeconds = Math.max(0, (now.getTime() - sessionAnchor.getTime()) / 1000);
    const sessionBreakSeconds = (input.attendance.breaks ?? [])
      .filter((b) => b.start >= sessionAnchor)
      .reduce(
        (sum, b) =>
          sum + (b.duration ?? (b.end ? 0 : Math.max(0, (now.getTime() - b.start.getTime()) / 1000))),
        0
      );
    workedHours =
      Math.max(0, totalWorkSeconds + elapsedSeconds - sessionBreakSeconds) / 3600;
    isProvisional = true;
  } else {
    workedHours = 0;
    noPunchOutReason = "Punched in but never punched out";
  }

  // 6. Required hours bar for this weekday — a scheduled "Half Day" weekday's
  // full-day bar IS the half-day threshold (shortened day, full credit for hitting it).
  const requiredHoursFullDay =
    weeklyOffValue === "Half Day" ? policy.minHoursHalfDay : policy.minHoursFullDay;
  const requiredHoursHalfDay = policy.minHoursHalfDay;

  let candidate: "FULL_DAY" | "HALF_DAY" | "ABSENT";
  if (workedHours >= requiredHoursFullDay) {
    candidate = "FULL_DAY";
  } else if (workedHours >= requiredHoursHalfDay) {
    candidate = "HALF_DAY";
  } else {
    candidate = "ABSENT";
  }

  if (candidate === "ABSENT") {
    const reason =
      noPunchOutReason ??
      `Absent — only ${round2(workedHours)}h worked (minimum ${requiredHoursHalfDay}h required)`;
    return { ...base, status: "ABSENT", workedHours: round2(workedHours), isProvisional, reason };
  }

  // 8. Lateness
  let isLate = false;
  let lateByMinutes = 0;
  const officeStartMinutes = parseTimeStringToMinutes(workingDay.officeTiming.startTime);
  const punchInMinutes = punchIn.getHours() * 60 + punchIn.getMinutes();
  if (officeStartMinutes !== null) {
    lateByMinutes = Math.max(0, punchInMinutes - officeStartMinutes);
    isLate = lateByMinutes > policy.graceMinutes + policy.lateMarkAfterMinutes;
  }

  // 9. Early exit (informational only)
  let earlyExitByMinutes = 0;
  const officeEndMinutes = parseTimeStringToMinutes(workingDay.officeTiming.endTime);
  if (punchOut && officeEndMinutes !== null) {
    const punchOutMinutes = punchOut.getHours() * 60 + punchOut.getMinutes();
    const early = officeEndMinutes - punchOutMinutes;
    earlyExitByMinutes = early > policy.earlyExitBufferMinutes ? early : 0;
  }

  // Overtime — only for full-day candidates
  let overtimeHours = 0;
  if (
    candidate === "FULL_DAY" &&
    policy.overtimeEnabled &&
    workedHours > policy.overtimeAfterHours
  ) {
    overtimeHours = round2(workedHours - policy.overtimeAfterHours);
  }

  const status: AttendanceDayStatus =
    candidate === "FULL_DAY"
      ? isLate
        ? "LATE_FULL_DAY"
        : "FULL_DAY"
      : isLate
      ? "LATE_HALF_DAY"
      : "HALF_DAY";

  const reasonParts: string[] = [];
  if (candidate === "FULL_DAY") reasonParts.push(`Full day — ${round2(workedHours)}h worked`);
  else reasonParts.push(`Half day — only ${round2(workedHours)}h worked (minimum ${requiredHoursFullDay}h required for full day)`);
  if (isLate) reasonParts.push(`Late by ${lateByMinutes} min`);
  if (isProvisional) reasonParts.push("(still punched in — provisional)");
  if (earlyExitByMinutes > 0) reasonParts.push(`Left ${earlyExitByMinutes} min early`);
  if (overtimeHours > 0) reasonParts.push(`${overtimeHours}h overtime`);

  return {
    status,
    isProvisional,
    workedHours: round2(workedHours),
    requiredHoursFullDay,
    requiredHoursHalfDay,
    isLate,
    lateByMinutes,
    earlyExitByMinutes,
    overtimeHours,
    reason: reasonParts.join(" · "),
  };
}

/**
 * Monthly aggregate: every Nth LATE day (LATE_FULL_DAY or LATE_HALF_DAY) in a
 * month converts into an extra 0.5-day payroll deduction, without changing
 * any individual day's status. lateCountForHalfDay <= 0 disables the rule.
 */
export function computeMonthlyLateAggregate(
  dayStatuses: AttendanceDayStatus[],
  lateCountForHalfDay: number
): { lateOccurrences: number; aggregateHalfDayDeductions: number } {
  const lateOccurrences = dayStatuses.filter(
    (s) => s === "LATE_FULL_DAY" || s === "LATE_HALF_DAY"
  ).length;

  if (!lateCountForHalfDay || lateCountForHalfDay <= 0) {
    return { lateOccurrences, aggregateHalfDayDeductions: 0 };
  }

  const halfDayUnits = Math.floor(lateOccurrences / lateCountForHalfDay);
  return { lateOccurrences, aggregateHalfDayDeductions: halfDayUnits * 0.5 };
}
