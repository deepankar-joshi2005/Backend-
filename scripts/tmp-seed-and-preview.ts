import "dotenv/config";
import mongoose from "mongoose";
import SalaryStructure from "../hrms/models/hrms/SalaryStructure";
import Attendance from "../hrms/models/hrms/Attendance";
import Leave from "../hrms/models/hrms/Leave";
import LeaveType from "../hrms/models/hrms/LeaveType";
import { buildPayrollBreakdownsForMonth } from "../hrms/controllers/hrms/payrollController";

const COMPANY_ID = new mongoose.Types.ObjectId("6aae18639c20733dfb5e9bae");
const EMP1 = new mongoose.Types.ObjectId("6aae2cbd8945c1cb24f3b552"); // Deepankar Joshi - manager
const EMP2 = new mongoose.Types.ObjectId("6aae2f128945c1cb24f3b554"); // Suraj Joshi - auditor
const MONTH = "2026-09";
const YEAR = 2026;
const MON = 8; // September, 0-indexed

const dateStr = (day: number) => `2026-09-${String(day).padStart(2, "0")}`;
const at = (day: number, h: number, m: number) => new Date(YEAR, MON, day, h, m, 0);
// payrollCalculator's findApprovedLeaveForDate compares leave dates via
// toISOString() (UTC calendar day), unlike Attendance's plain "date" string —
// so leave fromDate/toDate must be UTC midnight, not local midnight, or they
// land on the wrong calendar day on any machine ahead of UTC.
const atUTC = (day: number) => new Date(Date.UTC(YEAR, MON, day, 0, 0, 0));

async function upsertSalaryStructure(employee: mongoose.Types.ObjectId, data: Record<string, number>) {
  await SalaryStructure.findOneAndUpdate(
    { employee },
    { $set: { employee, companyId: COMPANY_ID, ...data } },
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
  opts: { punchInH: number; punchInM: number; hours: number }
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
        status: "PRESENT",
        companyId: COMPANY_ID,
        source: "PUNCH",
      },
    },
    { upsert: true, new: true }
  );
}

async function putLeave(employee: mongoose.Types.ObjectId, day: number, leaveType: string, reason: string) {
  await Leave.deleteMany({ employee });
  await Leave.create({
    employee,
    leaveType,
    fromDate: atUTC(day),
    toDate: atUTC(day),
    totalDays: 1,
    reason,
    status: "APPROVED",
    remainingLeaves: 11,
    companyId: COMPANY_ID,
  });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected. Seeding...");

  await upsertLeaveType("Casual Leave", "CL", true);
  await upsertLeaveType("Loss of Pay", "LOP", false);

  // ---- Salary structures (full component parity with CA's salary structure) ----
  await upsertSalaryStructure(EMP1, {
    basic: 40000,
    dearnessAllowance: 4000,
    retentionAllowance: 0,
    hra: 16000,
    conveyanceAllowance: 1600,
    transportAllowance: 1600,
    medicalAllowance: 1250,
    lta: 0,
    specialAllowance: 5000,
    shiftAllowance: 0,
    nightShiftAllowance: 0,
    attendanceAllowance: 500,
    productionIncentive: 0,
    productivityIncentive: 0,
    overtimeAllowance: 0,
    performanceIncentive: 2000,
    salesIncentive: 0,
    bonus: 0,
    arrears: 0,
    leaveEncashmentAllowance: 0,
    otherAllowance: 1000,
    pf: 1800,
    voluntaryPf: 0,
    employeeEsi: 0,
    professionalTax: 200,
    labourWelfareFund: 20,
    nps: 0,
    tds: 1500,
    otherStatutoryDeduction: 0,
    advance: 0,
    others: 0,
  });

  await upsertSalaryStructure(EMP2, {
    basic: 30000,
    dearnessAllowance: 3000,
    retentionAllowance: 0,
    hra: 12000,
    conveyanceAllowance: 1600,
    transportAllowance: 1600,
    medicalAllowance: 1250,
    lta: 0,
    specialAllowance: 3000,
    shiftAllowance: 0,
    nightShiftAllowance: 0,
    attendanceAllowance: 500,
    productionIncentive: 0,
    productivityIncentive: 0,
    overtimeAllowance: 0,
    performanceIncentive: 0,
    salesIncentive: 0,
    bonus: 0,
    arrears: 0,
    leaveEncashmentAllowance: 0,
    otherAllowance: 500,
    pf: 1500,
    voluntaryPf: 0,
    employeeEsi: 0,
    professionalTax: 200,
    labourWelfareFund: 20,
    nps: 0,
    tds: 800,
    otherStatutoryDeduction: 0,
    advance: 2000, // deliberately testing the advance-deduction bugfix
    others: 0,
  });

  // ---- Attendance / leave for Sept 1-18 (19th = today, auto-excluded by the calculator) ----
  // Weekdays in range: 1,2,3,4,7,8,9,10,11,14,15,16,17,18 | Saturdays: 5,12 | Sundays: 6,13 (auto weekly-off)

  // Employee 1 (manager): 3 late-full-days (trips the "every 3rd late = extra
  // half-day deduction" rule), 1 half day, 1 absent, 1 paid leave, rest full days.
  const emp1Full = [1, 3, 4, 7, 11, 14, 16, 18];
  for (const d of emp1Full) await putAttendance(EMP1, d, { punchInH: 9, punchInM: 25, hours: 8.5 });
  for (const d of [2, 8, 15]) await putAttendance(EMP1, d, { punchInH: 10, punchInM: 15, hours: 8.5 }); // late full day
  await putAttendance(EMP1, 9, { punchInH: 9, punchInM: 20, hours: 5 }); // half day
  // day 10 absent: no attendance record
  await putLeave(EMP1, 17, "Casual Leave", "Personal work");
  for (const d of [5, 12]) await putAttendance(EMP1, d, { punchInH: 9, punchInM: 25, hours: 4.5 }); // Saturday short day

  // Employee 2 (auditor): 2 absent days, 1 unpaid leave, 1 half day, 1 late-half-day, rest full days.
  const emp2Full = [1, 2, 7, 9, 10, 14, 15, 17, 18];
  for (const d of emp2Full) await putAttendance(EMP2, d, { punchInH: 9, punchInM: 20, hours: 8.5 });
  await putAttendance(EMP2, 4, { punchInH: 9, punchInM: 15, hours: 5 }); // half day
  await putAttendance(EMP2, 16, { punchInH: 10, punchInM: 20, hours: 5 }); // late half day
  // days 3, 11 absent: no attendance record
  await putLeave(EMP2, 8, "Loss of Pay", "Family emergency");
  for (const d of [5, 12]) await putAttendance(EMP2, d, { punchInH: 9, punchInM: 20, hours: 4.5 }); // Saturday short day

  console.log("Seeding done. Computing payroll preview via the real server logic...\n");

  const fakeReq: any = {
    user: { companyId: COMPANY_ID, role: "superadmin", isSystemAdmin: false },
  };

  const results = await buildPayrollBreakdownsForMonth(fakeReq, MONTH, [EMP1.toString(), EMP2.toString()]);

  for (const { breakdown } of results) {
    console.log("=================================================");
    console.log(`Employee: ${breakdown.name} (${breakdown.employeeId}) — ${breakdown.role}`);
    console.log(`Days in month so far counted: ${breakdown.daysInMonth} | Not yet occurred (today+future): ${breakdown.daysNotYetOccurred}`);
    console.log(`Full days: ${breakdown.fullDays} | Late full days: ${breakdown.lateFullDays}`);
    console.log(`Half days: ${breakdown.halfDays} | Late half days: ${breakdown.lateHalfDays}`);
    console.log(`Absent days: ${breakdown.absentDays}`);
    console.log(`Paid leave days: ${breakdown.paidLeaveDays} | Unpaid leave days: ${breakdown.unpaidLeaveDays}`);
    console.log(`Holiday days: ${breakdown.holidayDays} | Weekly-off days: ${breakdown.weeklyOffDays}`);
    console.log(`Late occurrences: ${breakdown.lateOccurrences} | Extra half-day deductions from late aggregate: ${breakdown.lateAggregateHalfDayDeductions}`);
    console.log(`Payable days: ${breakdown.payableDays} | LOP days: ${breakdown.lopDays} | Per-day rate: ₹${breakdown.perDayRate}`);
    console.log(`Gross (full monthly, all earning components): ₹${breakdown.gross}`);
    console.log(`Fixed deductions (all deduction components): ₹${breakdown.fixedDeduction}`);
    console.log(`LOP deduction (per-day rate x LOP days): ₹${breakdown.lopDeduction}`);
    console.log(`Total deduction: ₹${breakdown.deduction}`);
    console.log(`>>> NET PAYABLE (as of Sept 19): ₹${breakdown.net}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
