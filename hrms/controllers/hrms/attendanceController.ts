/** @format */

import { Response } from "express";
import Attendance from "../../models/hrms/Attendance";
import WorkingDay from "../../models/hrms/WorkingDay";
import AttendancePolicy from "../../models/hrms/AttendancePolicy";
import Holiday from "../../models/hrms/Holiday";
import Leave from "../../models/hrms/Leave";
import LeaveType from "../../models/hrms/LeaveType";
import { AuthRequest } from "../../middleware/auth";
import User from "../../models/User";
import { ROLES } from "../../constants";
import {
  classifyAttendanceDay,
  toWorkingDayLike,
  toPolicyLike,
} from "../../utils/attendanceStatus";
import { parseTimeStringToMinutes } from "../../utils/timeParser";
import { reverseGeocode } from "../../utils/reverseGeocode";

/* ================= HELPERS ================= */

const todayDate = () => new Date().toISOString().split("T")[0];

const secondsBetween = (start: Date, end: Date) =>
  Math.floor((end.getTime() - start.getTime()) / 1000);

const toDateKey = (d: Date | string) =>
  (typeof d === "string" ? d : d.toISOString()).split("T")[0];

/** True once `now` is past the company's configured office end time for today.
 * No working-day config (or unparseable time) means "never gate". */
const isPastOfficeEndTime = (endTime?: string | null, now: Date = new Date()) => {
  const officeEndMinutes = parseTimeStringToMinutes(endTime);
  if (officeEndMinutes === null) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= officeEndMinutes;
};

/** Start-time anchor for classifyAttendanceDay's live "still working" math —
 * the currently open session (after a re-punch-in) if there is one, else the
 * legacy single punchIn for records with no session history yet. */
const currentSessionAnchor = (r: {
  punchIn?: Date | null;
  punchOut?: Date | null;
  sessions?: { punchIn: Date; punchOut?: Date }[];
}): Date | null => {
  if (r.punchOut) return null;
  const lastSession = r.sessions && r.sessions.length > 0 ? r.sessions[r.sessions.length - 1] : null;
  if (lastSession && !lastSession.punchOut) return lastSession.punchIn;
  return r.punchIn ?? null;
};

/** Resolves and attaches a human-readable address in the background — never
 * delays the punch response, since geocoding is best-effort only. */
const resolveAddressInBackground = (
  attendanceId: any,
  field: "punchInLocation" | "punchOutLocation",
  lat: number,
  lng: number
) => {
  reverseGeocode(lat, lng)
    .then(async (address) => {
      if (!address) return;
      await Attendance.updateOne(
        { _id: attendanceId },
        { $set: { [`${field}.address`]: address } }
      );
    })
    .catch(() => {});
};

/** Finds an approved leave covering the given YYYY-MM-DD date, if any. */
const findApprovedLeaveForDate = (
  leaves: { fromDate: Date; toDate: Date; leaveType: string }[],
  leaveTypesByName: Map<string, boolean>,
  dateStr: string
): { leaveType: string; paid: boolean } | null => {
  const match = leaves.find(
    (l) => toDateKey(l.fromDate) <= dateStr && toDateKey(l.toDate) >= dateStr
  );
  if (!match) return null;
  return { leaveType: match.leaveType, paid: leaveTypesByName.get(match.leaveType) ?? false };
};

/* =====================================================
   ✅ PUNCH IN
===================================================== */
export const punchIn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const date = todayDate();
    const { lat, lng, accuracy } = req.body || {};

    const exists = await Attendance.findOne({ user: userId, date });

    // A session is still open (punched in, not yet punched out) — nothing to do.
    if (exists?.punchIn && !exists?.punchOut) {
      return res.status(400).json({ message: "Already punched in today" });
    }

    // Re-punching in after an earlier punch-out today (e.g. stepped out and
    // came back) — allowed as many times as needed, but only while the
    // company's office hours for today haven't ended yet.
    if (exists?.punchOut) {
      const workingDay = await WorkingDay.findOne({ companyId: req.user.companyId });
      if (isPastOfficeEndTime(workingDay?.officeTiming?.endTime)) {
        return res.status(400).json({
          message: "Office hours have ended for today. You can punch in again tomorrow.",
        });
      }
    }

    const attendance =
      exists ||
      (await Attendance.create({
        user: userId,
        date,
        companyId: req.user.companyId, // Set companyId on creation
      }));

    const isFirstSessionOfDay = !attendance.punchIn;
    const now = new Date();
    const location =
      typeof lat === "number" && typeof lng === "number" ? { lat, lng, accuracy } : undefined;

    attendance.sessions.push({ punchIn: now, punchInLocation: location });

    // `punchIn` tracks the FIRST session of the day (used for lateness) and
    // never moves on a re-punch-in; `punchOut` is cleared to mark the day open again.
    if (isFirstSessionOfDay) {
      attendance.punchIn = now;
      attendance.punchInLocation = location;
    }
    attendance.punchOut = undefined;
    attendance.punchOutLocation = undefined;

    await attendance.save();

    res.json({ message: "Punch in successful", attendance });

    // Only the first session's punch-in feeds the top-level location field —
    // resolving it for a later re-punch-in would overwrite that address with
    // coordinates that no longer match the stored lat/lng.
    if (location && isFirstSessionOfDay) {
      resolveAddressInBackground(attendance._id, "punchInLocation", lat, lng);
    }
  } catch (err) {
    res.status(500).json({ message: "Punch in failed" });
  }
};

/* =====================================================
   🚪 PUNCH OUT
===================================================== */
export const punchOut = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const date = todayDate();
    const { lat, lng, accuracy } = req.body || {};

    const attendance = await Attendance.findOne({ user: userId, date });

    if (!attendance || !attendance.punchIn) {
      return res.status(400).json({ message: "Not punched in yet" });
    }

    if (attendance.punchOut) {
      return res.status(400).json({ message: "Already punched out" });
    }

    let openSession =
      attendance.sessions.length > 0
        ? attendance.sessions[attendance.sessions.length - 1]
        : null;

    if (!openSession) {
      // Record punched in before multi-session tracking shipped — synthesize
      // the implicit first session from the top-level punch-in fields.
      attendance.sessions.push({
        punchIn: attendance.punchIn,
        punchInLocation: attendance.punchInLocation,
      });
      openSession = attendance.sessions[attendance.sessions.length - 1];
    }

    const now = new Date();
    const location =
      typeof lat === "number" && typeof lng === "number" ? { lat, lng, accuracy } : undefined;

    openSession.punchOut = now;
    if (location) openSession.punchOutLocation = location;

    attendance.punchOut = now;
    if (location) attendance.punchOutLocation = location;

    // Only breaks taken during THIS session count against it — earlier
    // sessions today already had their own break time subtracted when they closed.
    const sessionBreakSeconds = attendance.breaks
      .filter((b) => b.end && b.start >= openSession!.punchIn)
      .reduce((sum, b) => sum + (b.duration || 0), 0);

    const sessionWorkSeconds = Math.max(
      0,
      secondsBetween(openSession.punchIn, now) - sessionBreakSeconds
    );

    // Accumulate on top of whatever earlier sessions today already earned,
    // instead of overwriting — that's what let a re-punch-in silently erase
    // previously logged work time.
    attendance.totalWorkSeconds = (attendance.totalWorkSeconds || 0) + sessionWorkSeconds;

    await attendance.save();

    res.json({ message: "Punch out successful", attendance });

    if (typeof lat === "number" && typeof lng === "number") {
      resolveAddressInBackground(attendance._id, "punchOutLocation", lat, lng);
    }
  } catch (err) {
    res.status(500).json({ message: "Punch out failed" });
  }
};

/* =====================================================
   ☕ START BREAK
===================================================== */
export const startBreak = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const date = todayDate();

    const attendance = await Attendance.findOne({ user: userId, date });

    if (!attendance || !attendance.punchIn || attendance.punchOut) {
      return res.status(400).json({ message: "Break not allowed" });
    }

    const lastBreak =
      attendance.breaks.length > 0
        ? attendance.breaks[attendance.breaks.length - 1]
        : null;
    if (lastBreak && !lastBreak.end) {
      return res.status(400).json({ message: "Break already running" });
    }

    attendance.breaks.push({ start: new Date() });
    await attendance.save();

    res.json({ message: "Break started", attendance });
  } catch (err) {
    res.status(500).json({ message: "Start break failed" });
  }
};

/* =====================================================
   ▶ END BREAK
===================================================== */
export const endBreak = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const date = todayDate();

    const attendance = await Attendance.findOne({ user: userId, date });

    if (!attendance) {
      return res.status(400).json({ message: "No attendance found" });
    }

    const lastBreak =
      attendance.breaks.length > 0
        ? attendance.breaks[attendance.breaks.length - 1]
        : null;
    if (!lastBreak || lastBreak.end) {
      return res.status(400).json({ message: "No active break" });
    }

    lastBreak.end = new Date();
    lastBreak.duration = secondsBetween(lastBreak.start, lastBreak.end);

    attendance.totalBreakSeconds += lastBreak.duration;
    await attendance.save();

    res.json({ message: "Break ended", attendance });
  } catch (err) {
    res.status(500).json({ message: "End break failed" });
  }
};

/* =====================================================
   📄 GET MY ATTENDANCE
===================================================== */
export const getMyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const records = await Attendance.find({ user: userId }).sort({
      date: -1,
    });

    const [workingDay, policy, holidays, leaves, leaveTypes] = await Promise.all([
      WorkingDay.findOne({ companyId }),
      AttendancePolicy.findOne({ companyId }),
      Holiday.find({ companyId }),
      Leave.find({ employee: userId, status: "APPROVED" }),
      LeaveType.find({}),
    ]);

    const holidayByDate = new Map(holidays.map((h: any) => [toDateKey(h.date), h]));
    const leaveTypesByName = new Map(leaveTypes.map((lt: any) => [lt.name, lt.paid]));
    const workingDayLike = toWorkingDayLike(workingDay);
    const policyLike = toPolicyLike(policy);

    const classified = records.map((r: any) => {
      const dateStr = r.date;
      const holiday = holidayByDate.get(dateStr) || null;
      const leave = findApprovedLeaveForDate(leaves as any, leaveTypesByName, dateStr);

      const classification = classifyAttendanceDay({
        date: dateStr,
        attendance: {
          punchIn: r.punchIn,
          punchOut: r.punchOut,
          totalBreakSeconds: r.totalBreakSeconds,
          totalWorkSeconds: r.totalWorkSeconds,
          currentSessionPunchIn: currentSessionAnchor(r),
          breaks: r.breaks,
        },
        workingDay: workingDayLike,
        policy: policyLike,
        holiday: holiday ? { title: holiday.title } : null,
        leave,
      });

      return { ...r.toObject(), classification };
    });

    res.json(classified);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
};
/* =====================================================
   📊 GET TEAM ATTENDANCE (MANAGER)
===================================================== */
export const getTeamAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const managerId = req.user!.id;
    const { month, year } = req.query as { month: string; year: string };

    if (!month || !year) {
      return res.status(400).json({ message: "Month & Year required" });
    }

    const m = Number(month);
    const y = Number(year);

    const startDateStr = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const endDateStr = `${y}-${String(m + 1).padStart(2, "0")}-${new Date(
      y,
      m + 1,
      0,
    ).getDate()}`;
    const todayStr = new Date().toISOString().split("T")[0];

    /* 1️⃣ TEAM MEMBERS (only this manager's direct reports) */
    const users = await User.find({ managerId }, "name role companyId employeeId profilePicture designationId")
      .populate("designationId", "name")
      .lean();
    const userIds = users.map((u) => u._id);

    /* 2️⃣ ATTENDANCE */
    const attendance = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: startDateStr, $lte: endDateStr },
    })
      .populate("user", "name role")
      .lean();

    /* 3️⃣ POLICY-DRIVEN STATUS MATRIX — same classification pipeline as
       getAllAttendance, just scoped to the manager's own team, so a
       one-minute punch-in/out is graded ABSENT here exactly like it is
       for HR/Admin instead of the old "has a punchIn" shortcut. */
    const companyIds = Array.from(new Set(users.map((u: any) => String(u.companyId))));

    const [workingDays, policies, holidaysForMonth, leavesForMonth, leaveTypes] = await Promise.all([
      WorkingDay.find({ companyId: { $in: companyIds } }),
      AttendancePolicy.find({ companyId: { $in: companyIds } }),
      Holiday.find({
        companyId: { $in: companyIds },
        date: { $gte: new Date(startDateStr), $lte: new Date(endDateStr) },
      }),
      Leave.find({
        employee: { $in: userIds },
        status: "APPROVED",
        fromDate: { $lte: new Date(endDateStr) },
        toDate: { $gte: new Date(startDateStr) },
      }),
      LeaveType.find({}),
    ]);

    const workingDayByCompany = new Map(
      workingDays.map((w: any) => [String(w.companyId), toWorkingDayLike(w)])
    );
    const policyByCompany = new Map(
      policies.map((p: any) => [String(p.companyId), toPolicyLike(p)])
    );
    const holidayByCompanyDate = new Map(
      holidaysForMonth.map((h: any) => [`${h.companyId}_${toDateKey(h.date)}`, h])
    );
    const leaveTypesByName = new Map(leaveTypes.map((lt: any) => [lt.name, lt.paid]));
    const leavesByUser = new Map<string, any[]>();
    for (const l of leavesForMonth as any[]) {
      const key = String(l.employee);
      if (!leavesByUser.has(key)) leavesByUser.set(key, []);
      leavesByUser.get(key)!.push(l);
    }
    const attendanceByUserDate = new Map(
      attendance.map((a: any) => [`${a.user?._id}_${a.date}`, a])
    );

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const matrix: {
      userId: string;
      date: string;
      status: string;
      isLate: boolean;
      lateByMinutes: number;
      workedHours: number;
      overtimeHours: number;
      earlyExitByMinutes: number;
      reason: string;
    }[] = [];

    for (const u of users as any[]) {
      const userIdStr = String(u._id);
      const companyIdStr = String(u.companyId);
      const workingDayLike = workingDayByCompany.get(companyIdStr) || null;
      const policyLike = policyByCompany.get(companyIdStr) || null;
      const userLeaves = leavesByUser.get(userIdStr) || [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (dateStr > todayStr) break; // future day — nothing to classify yet

        const record = attendanceByUserDate.get(`${userIdStr}_${dateStr}`) as any;
        const holiday = holidayByCompanyDate.get(`${companyIdStr}_${dateStr}`) as any;
        const leave = findApprovedLeaveForDate(userLeaves as any, leaveTypesByName, dateStr);

        const classification = classifyAttendanceDay({
          date: dateStr,
          attendance: record
            ? {
                punchIn: record.punchIn,
                punchOut: record.punchOut,
                totalBreakSeconds: record.totalBreakSeconds,
                totalWorkSeconds: record.totalWorkSeconds,
                currentSessionPunchIn: currentSessionAnchor(record),
                breaks: record.breaks,
              }
            : null,
          workingDay: workingDayLike,
          policy: policyLike,
          holiday: holiday ? { title: holiday.title } : null,
          leave,
        });

        matrix.push({
          userId: userIdStr,
          date: dateStr,
          status: classification.status,
          isLate: classification.isLate,
          lateByMinutes: classification.lateByMinutes,
          workedHours: classification.workedHours,
          overtimeHours: classification.overtimeHours,
          earlyExitByMinutes: classification.earlyExitByMinutes,
          reason: classification.reason,
        });
      }
    }

    return res.json({ users, attendance, matrix });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to load team attendance" });
  }
};

/* =====================================================
   📊 HR / ADMIN – ALL ATTENDANCE
===================================================== */
export const getAllAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year, page, limit = 15, search = "" } = req.query;

    const m = Number(month);
    const y = Number(year);

    const startDateStr = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const endDateStr = `${y}-${String(m + 1).padStart(2, "0")}-${new Date(
      y,
      m + 1,
      0,
    ).getDate()}`;

    const todayStr = new Date().toISOString().split("T")[0];

    /* 🔍 SEARCH QUERY */
    const searchQuery = search
      ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { role: { $regex: search, $options: "i" } },
        ],
      }
      : {};

    /* 🔴 CHECK PAGINATION */
    const isPaginated = !!page;
    const pageNum = page ? Number(page) : 1;
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    /* 1️⃣ USERS QUERY */
    const userFilter: any = { ...searchQuery };
    
    // Multi-tenancy filtering
    if (req.user.role !== ROLES.HRMSAdmin) {
      userFilter.companyId = req.user.companyId;
    }

    let usersQuery = User.find(userFilter, "name role companyId employeeId profilePicture designationId")
      .populate("designationId", "name")
      .lean();

    if (isPaginated) {
      usersQuery = usersQuery.skip(skip).limit(limitNum);
    }

    const [users, totalUsers] = await Promise.all([
      usersQuery,
      User.countDocuments(searchQuery),
    ]);

    const userIds = users.map((u) => u._id);

    /* 2️⃣ ATTENDANCE */
    const attendanceFilter: any = {
      user: { $in: userIds },
      date: { $gte: startDateStr, $lte: endDateStr },
    };

    if (req.user.role !== ROLES.HRMSAdmin) {
      attendanceFilter.companyId = req.user.companyId;
    }

    const attendance = await Attendance.find(attendanceFilter)
      .populate("user", "name role")
      .lean();

    /* 3️⃣ TODAY PRESENT (real punch-in check — the old "PRESENT" status
       filter was inert, since Attendance.status is never updated away
       from its schema default) */
    const todayFilter: any = {
      date: todayStr,
      punchIn: { $exists: true },
    };

    if (req.user.role !== ROLES.HRMSAdmin) {
      todayFilter.companyId = req.user.companyId;
    }

    const totalTodayPresent = await Attendance.distinct("user", todayFilter).then((u) => u.length);

    /* 4️⃣ POLICY-DRIVEN STATUS MATRIX (single source of truth, shared with
       the day-detail endpoint and payroll — this is what the grid renders) */
    const companyIds = Array.from(new Set(users.map((u: any) => String(u.companyId))));

    const [workingDays, policies, holidaysForMonth, leavesForMonth, leaveTypes] = await Promise.all([
      WorkingDay.find({ companyId: { $in: companyIds } }),
      AttendancePolicy.find({ companyId: { $in: companyIds } }),
      Holiday.find({
        companyId: { $in: companyIds },
        date: { $gte: new Date(startDateStr), $lte: new Date(endDateStr) },
      }),
      Leave.find({
        employee: { $in: userIds },
        status: "APPROVED",
        fromDate: { $lte: new Date(endDateStr) },
        toDate: { $gte: new Date(startDateStr) },
      }),
      LeaveType.find({}),
    ]);

    const workingDayByCompany = new Map(
      workingDays.map((w: any) => [String(w.companyId), toWorkingDayLike(w)])
    );
    const policyByCompany = new Map(
      policies.map((p: any) => [String(p.companyId), toPolicyLike(p)])
    );
    const holidayByCompanyDate = new Map(
      holidaysForMonth.map((h: any) => [`${h.companyId}_${toDateKey(h.date)}`, h])
    );
    const leaveTypesByName = new Map(leaveTypes.map((lt: any) => [lt.name, lt.paid]));
    const leavesByUser = new Map<string, any[]>();
    for (const l of leavesForMonth as any[]) {
      const key = String(l.employee);
      if (!leavesByUser.has(key)) leavesByUser.set(key, []);
      leavesByUser.get(key)!.push(l);
    }
    const attendanceByUserDate = new Map(
      attendance.map((a: any) => [`${a.user?._id}_${a.date}`, a])
    );

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const matrix: {
      userId: string;
      date: string;
      status: string;
      isLate: boolean;
      lateByMinutes: number;
      workedHours: number;
      overtimeHours: number;
      earlyExitByMinutes: number;
      reason: string;
    }[] = [];

    for (const u of users as any[]) {
      const userIdStr = String(u._id);
      const companyIdStr = String(u.companyId);
      const workingDayLike = workingDayByCompany.get(companyIdStr) || null;
      const policyLike = policyByCompany.get(companyIdStr) || null;
      const userLeaves = leavesByUser.get(userIdStr) || [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (dateStr > todayStr) break; // future day — nothing to classify yet

        const record = attendanceByUserDate.get(`${userIdStr}_${dateStr}`) as any;
        const holiday = holidayByCompanyDate.get(`${companyIdStr}_${dateStr}`) as any;
        const leave = findApprovedLeaveForDate(userLeaves as any, leaveTypesByName, dateStr);

        const classification = classifyAttendanceDay({
          date: dateStr,
          attendance: record
            ? {
                punchIn: record.punchIn,
                punchOut: record.punchOut,
                totalBreakSeconds: record.totalBreakSeconds,
                totalWorkSeconds: record.totalWorkSeconds,
                currentSessionPunchIn: currentSessionAnchor(record),
                breaks: record.breaks,
              }
            : null,
          workingDay: workingDayLike,
          policy: policyLike,
          holiday: holiday ? { title: holiday.title } : null,
          leave,
        });

        matrix.push({
          userId: userIdStr,
          date: dateStr,
          status: classification.status,
          isLate: classification.isLate,
          lateByMinutes: classification.lateByMinutes,
          workedHours: classification.workedHours,
          overtimeHours: classification.overtimeHours,
          earlyExitByMinutes: classification.earlyExitByMinutes,
          reason: classification.reason,
        });
      }
    }

    res.json({
      page: isPaginated ? pageNum : null,
      limit: isPaginated ? limitNum : null,
      totalUsers,
      totalPages: isPaginated ? Math.ceil(totalUsers / limitNum) : 1,
      totalTodayPresent,
      users,
      attendance,
      matrix,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
};

/* =====================================================
   🔎 SINGLE DAY DETAIL (for the attendance-grid click-through modal)
===================================================== */
export const getAttendanceDayDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, date } = req.params;

    const targetUser = await User.findById(userId).select(
      "name role companyId managerId"
    );
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isSelf = String(req.user._id) === String(userId);
    const isManager = String(targetUser.managerId || "") === String(req.user._id);
    const isAdminRole =
      req.user.isSystemAdmin ||
      req.user.role === ROLES.HRMSAdmin ||
      req.user.role === ROLES.SuperAdmin;
    const sameCompanyAdmin =
      String(targetUser.companyId) === String(req.user.companyId) &&
      req.user.role === ROLES.Admin;

    if (!isSelf && !isManager && !isAdminRole && !sameCompanyAdmin) {
      return res.status(403).json({ message: "Access denied." });
    }

    const companyId = targetUser.companyId;

    const [record, workingDay, policy, holiday, leaves, leaveTypes] = await Promise.all([
      Attendance.findOne({ user: userId, date })
        .populate("approvedBy", "name")
        .populate("sourceRequestId", "type reason"),
      WorkingDay.findOne({ companyId }),
      AttendancePolicy.findOne({ companyId }),
      Holiday.findOne({ companyId, date: new Date(date) }),
      Leave.find({ employee: userId, status: "APPROVED", fromDate: { $lte: new Date(date) }, toDate: { $gte: new Date(date) } }),
      LeaveType.find({}),
    ]);

    const leaveTypesByName = new Map(leaveTypes.map((lt: any) => [lt.name, lt.paid]));
    const leave = findApprovedLeaveForDate(leaves as any, leaveTypesByName, date);

    const classification = classifyAttendanceDay({
      date,
      attendance: record
        ? {
            punchIn: record.punchIn,
            punchOut: record.punchOut,
            totalBreakSeconds: record.totalBreakSeconds,
            totalWorkSeconds: record.totalWorkSeconds,
            currentSessionPunchIn: currentSessionAnchor(record),
            breaks: record.breaks,
          }
        : null,
      workingDay: toWorkingDayLike(workingDay),
      policy: toPolicyLike(policy),
      holiday: holiday ? { title: (holiday as any).title } : null,
      leave,
    });

    res.json({
      date,
      user: { _id: targetUser._id, name: targetUser.name, role: targetUser.role },
      punchIn: record?.punchIn || null,
      punchOut: record?.punchOut || null,
      punchInLocation: record?.punchInLocation || null,
      punchOutLocation: record?.punchOutLocation || null,
      sessions: record?.sessions || [],
      breaks: record?.breaks || [],
      totalBreakSeconds: record?.totalBreakSeconds || 0,
      totalWorkSeconds: record?.totalWorkSeconds || 0,
      classification,
      source: record?.source || "PUNCH",
      approvedBy: record?.approvedBy || null,
      approvedAt: record?.approvedAt || null,
      sourceRequest: record?.sourceRequestId || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch attendance day detail" });
  }
};


