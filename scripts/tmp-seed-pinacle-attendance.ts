import "dotenv/config";
import mongoose from "mongoose";
import SalaryStructure from "../hrms/models/hrms/SalaryStructure";
import Attendance from "../hrms/models/hrms/Attendance";
import Leave from "../hrms/models/hrms/Leave";
import LeaveType from "../hrms/models/hrms/LeaveType";

const COMPANY_ID = new mongoose.Types.ObjectId("6ab603eaa2928a6c56077b1b");
const FINANCE = new mongoose.Types.ObjectId("6abb47e51a4a3786aad62270"); // Pinacle Finance - finance
const MANAGER = new mongoose.Types.ObjectId("6abb47101a4a3786aad6226c"); // Pinacle Manager - manager
const YEAR = 2026;
const MON = 8; // September, 0-indexed

const dateStr = (day: number) => `2026-09-${String(day).padStart(2, "0")}`;
const at = (day: number, h: number, m: number) => new Date(YEAR, MON, day, h, m, 0);
// payrollCalculator's findApprovedLeaveForDate compares leave dates via
// toISOString() (UTC calendar day), unlike Attendance's plain "date" string —
// so leave fromDate/toDate must be UTC midnight, not local midnight.
const atUTC = (day: number) => new Date(Date.UTC(YEAR, MON, day, 0, 0, 0));

async function upsertSalaryStructure(employee: mongoose.Types.ObjectId, role: string, data: Record<string, number>) {
  await SalaryStructure.findOneAndUpdate(
    { employee },
    { $set: { employee, companyId: COMPANY_ID, role, ...data } },
    { upsert: true, new: true }
  );
}

async function upsertLeaveType(name: string, code: string, paid: boolean) {
  return LeaveType.findOneAndUpdate(
    { name },
    { $setOnInsert: { name, code, maxDays: 12, paid, carryForward: false, isActive: true } },
    { upsert: true, new: true }
  );
}

async function putAttendance(
  user: mongoose.Types.ObjectId,
  day: number,
  opts: { punchInH: number; punchInM: number; hours: number; status?: "PRESENT" | "ABSENT" }
) {
  const punchIn = at(day, opts.punchInH, opts.punchInM);
  const punchOut = new Date(punchIn.getTime() + (opts.hours + 1) * 3600 * 1000); // +1h lunch break window
  await Attendance.findOneAndUpdate(
    { user, date: dateStr(day) },
    {
      $set: {
        user,
        date: dateStr(day),
        punchIn,
        punchOut,
        totalBreakSeconds: 3600,
        totalWorkSeconds: opts.hours * 3600,
        status: opts.status ?? "PRESENT",
        companyId: COMPANY_ID,
        source: "PUNCH",
      },
    },
    { upsert: true, new: true }
  );
}

async function putAbsent(user: mongoose.Types.ObjectId, day: number) {
  // Absence for payroll purposes = simply no Attendance doc for (user, date).
  // Remove any existing record so the day reads as absent.
  await Attendance.deleteOne({ user, date: dateStr(day) });
}

async function putLeave(
  employee: mongoose.Types.ObjectId,
  day: number,
  leaveType: string,
  reason: string
) {
  await Leave.findOneAndUpdate(
    { employee, fromDate: atUTC(day), toDate: atUTC(day) },
    {
      $set: {
        employee,
        leaveType,
        fromDate: atUTC(day),
        toDate: atUTC(day),
        totalDays: 1,
        reason,
        status: "APPROVED",
        remainingLeaves: 11,
        companyId: COMPANY_ID,
      },
    },
    { upsert: true, new: true }
  );
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected. Seeding Pinacle finance + manager dummy data...");

  await upsertLeaveType("Casual Leave", "CL", true);
  await upsertLeaveType("Loss of Pay", "LOP", false);

  // ---- Salary structures ----
  await upsertSalaryStructure(FINANCE, "finance", {
    basic: 35000,
    dearnessAllowance: 3500,
    retentionAllowance: 0,
    hra: 14000,
    conveyanceAllowance: 1600,
    transportAllowance: 1600,
    medicalAllowance: 1250,
    lta: 0,
    specialAllowance: 4000,
    shiftAllowance: 0,
    nightShiftAllowance: 0,
    attendanceAllowance: 500,
    productionIncentive: 0,
    productivityIncentive: 0,
    overtimeAllowance: 0,
    performanceIncentive: 1500,
    salesIncentive: 0,
    bonus: 0,
    arrears: 0,
    leaveEncashmentAllowance: 0,
    otherAllowance: 500,
    pf: 1700,
    voluntaryPf: 0,
    employeeEsi: 0,
    professionalTax: 200,
    labourWelfareFund: 20,
    nps: 0,
    tds: 1200,
    otherStatutoryDeduction: 0,
    advance: 0,
    others: 0,
  });

  await upsertSalaryStructure(MANAGER, "manager", {
    basic: 45000,
    dearnessAllowance: 4500,
    retentionAllowance: 0,
    hra: 18000,
    conveyanceAllowance: 1600,
    transportAllowance: 1600,
    medicalAllowance: 1250,
    lta: 0,
    specialAllowance: 6000,
    shiftAllowance: 0,
    nightShiftAllowance: 0,
    attendanceAllowance: 500,
    productionIncentive: 0,
    productivityIncentive: 0,
    overtimeAllowance: 0,
    performanceIncentive: 2500,
    salesIncentive: 0,
    bonus: 0,
    arrears: 0,
    leaveEncashmentAllowance: 0,
    otherAllowance: 1000,
    pf: 2000,
    voluntaryPf: 0,
    employeeEsi: 0,
    professionalTax: 200,
    labourWelfareFund: 20,
    nps: 0,
    tds: 2000,
    otherStatutoryDeduction: 0,
    advance: 0,
    others: 0,
  });

  // ---- Attendance / leave for Sept 1-29 ----
  // Sundays (6,13,20,27) = weekly off, no record. Saturdays (5,12,19,26) = short day.
  const saturdays = [5, 12, 19, 26];

  // ---- Pinacle Finance (finance role) ----
  // Full present days
  const financeFull = [1, 2, 3, 4, 7, 8, 11, 14, 15, 18, 21, 25, 28, 29];
  for (const d of financeFull) await putAttendance(FINANCE, d, { punchInH: 9, punchInM: 25, hours: 8.5 });
  // Late full days (3 -> trips the every-3rd-late extra half-day deduction rule)
  for (const d of [9, 16, 23]) await putAttendance(FINANCE, d, { punchInH: 10, punchInM: 15, hours: 8.5 });
  // Half day
  await putAttendance(FINANCE, 22, { punchInH: 9, punchInM: 20, hours: 5 });
  // Absent days
  for (const d of [10, 24]) await putAbsent(FINANCE, d);
  // Paid leave
  await putLeave(FINANCE, 17, "Casual Leave", "Personal work");
  // Short Saturdays
  for (const d of saturdays) await putAttendance(FINANCE, d, { punchInH: 9, punchInM: 25, hours: 4.5 });

  // ---- Pinacle Manager (manager role) ----
  // Full present days
  const managerFull = [1, 2, 4, 7, 9, 10, 14, 16, 17, 18, 22, 23, 25, 29];
  for (const d of managerFull) await putAttendance(MANAGER, d, { punchInH: 9, punchInM: 20, hours: 8.5 });
  // Late full days
  for (const d of [8, 21]) await putAttendance(MANAGER, d, { punchInH: 10, punchInM: 10, hours: 8.5 });
  // Late half day
  await putAttendance(MANAGER, 15, { punchInH: 10, punchInM: 20, hours: 5 });
  // Half day
  await putAttendance(MANAGER, 28, { punchInH: 9, punchInM: 15, hours: 5 });
  // Absent days
  for (const d of [3, 11]) await putAbsent(MANAGER, d);
  // Unpaid leave
  await putLeave(MANAGER, 24, "Loss of Pay", "Family emergency");
  // Short Saturdays
  for (const d of saturdays) await putAttendance(MANAGER, d, { punchInH: 9, punchInM: 20, hours: 4.5 });

  const financeCount = await Attendance.countDocuments({ user: FINANCE, date: { $gte: "2026-09-01", $lte: "2026-09-29" } });
  const managerCount = await Attendance.countDocuments({ user: MANAGER, date: { $gte: "2026-09-01", $lte: "2026-09-29" } });
  console.log(`Done. Finance attendance rows: ${financeCount}, Manager attendance rows: ${managerCount}`);
  console.log("Finance: 14 full + 3 late-full + 1 half + 2 absent + 1 paid leave (17th) + 4 short Saturdays");
  console.log("Manager: 14 full + 2 late-full + 1 late-half + 1 half + 2 absent + 1 unpaid leave (24th) + 4 short Saturdays");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
