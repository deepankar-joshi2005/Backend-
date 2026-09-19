/** @format */

import { Response } from "express";
import Payroll from "../../models/hrms/Payroll";
import PayrollRun from "../../models/hrms/PayrollRun";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";
import User from "../../models/User";
import SalaryStructure from "../../models/hrms/SalaryStructure";
import Attendance from "../../models/hrms/Attendance";
import Holiday from "../../models/hrms/Holiday";
import Leave from "../../models/hrms/Leave";
import LeaveType from "../../models/hrms/LeaveType";
import LeaveEncashment from "../../models/hrms/LeaveEncashment";
import WorkingDay from "../../models/hrms/WorkingDay";
import AttendancePolicy from "../../models/hrms/AttendancePolicy";
import { toWorkingDayLike, toPolicyLike } from "../../utils/attendanceStatus";
import { computeMonthlyPayrollForEmployee, PayrollBreakdown } from "../../utils/payrollCalculator";
import { monthBounds, defaultRunTitle } from "../../utils/payrollRunHelpers";

/* =====================================================
   🧮 SHARED: build server-authoritative payroll breakdowns for a month
   Used identically by preview, run, and recalculate — single source of
   truth so none of them can ever disagree with each other.
===================================================== */
export async function buildPayrollBreakdownsForMonth(
  req: AuthRequest,
  month: string,
  filterUserIds?: string[]
): Promise<{ breakdown: PayrollBreakdown; companyId: any }[]> {
  const { companyId, role, isSystemAdmin } = req.user;
  const scoped = !isSystemAdmin && role !== ROLES.HRMSAdmin;

  const userFilter: any = { status: "ACTIVE" };
  if (scoped) userFilter.companyId = companyId;
  if (filterUserIds?.length) userFilter._id = { $in: filterUserIds };

  const employees = await User.find(userFilter, "name employeeId role companyId").lean();
  if (!employees.length) return [];

  const employeeIds = employees.map((e: any) => e._id);
  const companyIds = Array.from(new Set(employees.map((e: any) => String(e.companyId))));

  const monthStart = new Date(`${month}-01`);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const lastDay = monthEnd.getDate();
  const dateStart = `${month}-01`;
  const dateEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

  const [
    salaryStructures,
    workingDays,
    policies,
    holidays,
    leaves,
    leaveTypes,
    attendanceRecords,
    encashments,
  ] = await Promise.all([
    SalaryStructure.find({ employee: { $in: employeeIds } }).lean(),
    WorkingDay.find({ companyId: { $in: companyIds } }),
    AttendancePolicy.find({ companyId: { $in: companyIds } }),
    Holiday.find({ companyId: { $in: companyIds }, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
    Leave.find({
      employee: { $in: employeeIds },
      status: "APPROVED",
      fromDate: { $lte: monthEnd },
      toDate: { $gte: monthStart },
    }).lean(),
    LeaveType.find({}).lean(),
    Attendance.find({ user: { $in: employeeIds }, date: { $gte: dateStart, $lte: dateEnd } }).lean(),
    LeaveEncashment.find({
      employee: { $in: employeeIds },
      status: "APPROVED",
      payrollMonth: month,
    }).lean(),
  ]);

  const salaryByEmployee = new Map(salaryStructures.map((s: any) => [String(s.employee), s]));
  const workingDayByCompany = new Map(workingDays.map((w: any) => [String(w.companyId), toWorkingDayLike(w)]));
  const policyByCompany = new Map(policies.map((p: any) => [String(p.companyId), toPolicyLike(p)]));
  const leaveTypesByName = new Map(leaveTypes.map((lt: any) => [lt.name, lt.paid]));

  const holidaysByCompany = new Map<string, any[]>();
  for (const h of holidays as any[]) {
    const key = String(h.companyId);
    if (!holidaysByCompany.has(key)) holidaysByCompany.set(key, []);
    holidaysByCompany.get(key)!.push(h);
  }

  const leavesByEmployee = new Map<string, any[]>();
  for (const l of leaves as any[]) {
    const key = String(l.employee);
    if (!leavesByEmployee.has(key)) leavesByEmployee.set(key, []);
    leavesByEmployee.get(key)!.push(l);
  }

  const attendanceByEmployee = new Map<string, any[]>();
  for (const a of attendanceRecords as any[]) {
    const key = String(a.user);
    if (!attendanceByEmployee.has(key)) attendanceByEmployee.set(key, []);
    attendanceByEmployee.get(key)!.push(a);
  }

  const encashmentBonusByEmployee = new Map<string, number>();
  for (const e of encashments as any[]) {
    const key = String(e.employee);
    encashmentBonusByEmployee.set(key, (encashmentBonusByEmployee.get(key) || 0) + (Number(e.totalAmount) || 0));
  }

  const results: { breakdown: PayrollBreakdown; companyId: any }[] = [];

  for (const emp of employees as any[]) {
    const salary = salaryByEmployee.get(String(emp._id));
    if (!salary) continue; // no salary structure configured yet — can't compute pay

    const companyIdStr = String(emp.companyId);

    const breakdown = computeMonthlyPayrollForEmployee({
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
export const getPayrollByMonth = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ message: "Month required" });
    }

    const filter: any = { month };
    
    // Multi-tenancy filtering
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    }

    const payroll = await Payroll.find(filter)
      .populate("employee", "name email role employeeId")
      .sort({ createdAt: -1 });

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payroll" });
  }
};

/* ================= SHARED: compute + persist payroll for a month =================
   Used by both the legacy /payroll/run endpoint and the new
   /payroll/runs/:month/run endpoint, so the two can never disagree. */
export async function runPayrollForMonth(req: AuthRequest, month: string): Promise<number> {
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

  await Payroll.bulkWrite(bulkOps);
  return results.length;
}

/* ================= SAVE / UPDATE PAYROLL (RUN PAYROLL) =================
   Server-authoritative: recomputes every employee's payroll from
   attendance + policy + salary structure. The client can no longer post
   trusted final numbers — it only tells us which month to run. */
export const savePayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.body;

    if (!month) {
      return res.status(400).json({ message: "Month required" });
    }

    await runPayrollForMonth(req, month);

    res.json({ message: "Payroll processed successfully" });
  } catch (error: any) {
    console.error(error);
    if (error.message === "No employees with a salary structure found for this month") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to save payroll" });
  }
};

/* ================= UPDATE STATUS (Paid) ================= */
export const updatePayrollStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const existingPayroll = await Payroll.findById(req.params.id);
    if (!existingPayroll) {
      return res.status(404).json({ message: "Payroll not found" });
    }

    // Access check
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && existingPayroll.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("employee", "name email role");

    if (!payroll) {
      return res.status(404).json({ message: "Payroll not found" });
    }

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: "Failed to update payroll status" });
  }
};

/* ================= PAY ALL (BULK) =================
   Marks every "Processed" payroll record for a month as "Paid" in one go,
   so Finance doesn't have to open each employee's row individually. */
export const payAllPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.body;
    if (!month) {
      return res.status(400).json({ message: "Month required" });
    }

    const filter: any = { month, status: "Processed" };
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    }

    const result = await Payroll.updateMany(filter, { $set: { status: "Paid" } });

    // 🔥 If every employee for a company+month is now Paid, mark that run Completed.
    const scopeFilter: any = { month };
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
      scopeFilter.companyId = req.user.companyId;
    }
    const companyIds = await Payroll.distinct("companyId", scopeFilter);
    const today = new Date().toISOString().slice(0, 10);

    for (const companyId of companyIds) {
      const remaining = await Payroll.countDocuments({ month, companyId, status: { $ne: "Paid" } });
      if (remaining > 0) continue;

      const run = await PayrollRun.findOne({ companyId, month });
      if (run) {
        run.status = "Completed";
        if (!run.payDate) run.payDate = today;
        await run.save();
      } else {
        const { start, end } = monthBounds(month);
        await PayrollRun.create({
          companyId,
          month,
          title: defaultRunTitle(month),
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
  } catch (error) {
    res.status(500).json({ message: "Failed to pay all payroll" });
  }
};

/* ================= RESET PAYROLL BY MONTH (DEV / ADMIN) ================= */
export const resetPayrollByMonth = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ message: "Month required" });
    }

    // ❌ Paid payroll delete nahi hone chahiye
    const paidFilter: any = { month, status: "Paid" };
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
      paidFilter.companyId = req.user.companyId;
    }

    const paidExists = await Payroll.findOne(paidFilter);

    if (paidExists) {
      return res.status(400).json({
        message: "Cannot reset payroll. Some salaries are already paid.",
      });
    }

    const deleteFilter: any = { month };
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
      deleteFilter.companyId = req.user.companyId;
    }

    await Payroll.deleteMany(deleteFilter);

    res.json({
      message: `Payroll reset successfully for ${month}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to reset payroll" });
  }
};

// PATCH /payroll/:id/reject
export const rejectPayroll = async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ message: "Rejection reason required" });
  }

  const payroll = await Payroll.findById(req.params.id);
  if (!payroll) {
    return res.status(404).json({ message: "Payroll not found" });
  }

  // Access check
  if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && payroll.companyId?.toString() !== req.user.companyId?.toString()) {
    return res.status(403).json({ message: "Access denied." });
  }

  payroll.status = "Rejected";
  payroll.rejectReason = reason;
  payroll.rejectedAt = new Date();

  await payroll.save();

  res.json(payroll);
};
/* ================= RECALCULATE REJECTED PAYROLL =================
   Also server-authoritative now — recomputes this one employee's payroll
   from current attendance/policy data rather than trusting client numbers. */
export const recalculatePayroll = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { payrollId } = req.body;

    if (!payrollId) {
      return res.status(400).json({ message: "PayrollId required" });
    }

    const payroll = await Payroll.findById(payrollId);

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
    payroll.dailyBreakdown = breakdown.dailyBreakdown as any;

    payroll.status = "Processed"; // 🔥 reset status
    payroll.rejectReason = undefined;
    payroll.rejectedAt = undefined;

    await payroll.save();

    res.json({
      message: "Payroll recalculated successfully",
      payroll,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to recalculate payroll" });
  }
};

/* ================= GET PAYROLL PREVIEW =================
   Same server-authoritative calculation as "Run Payroll", just not
   persisted — lets HR/Admin review the full breakdown before committing. */
export const getPayrollPreview = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query as { month?: string };
    if (!month) return res.status(400).json({ message: "Month required" });

    const results = await buildPayrollBreakdownsForMonth(req, month);
    res.json(results.map((r) => ({ ...r.breakdown, status: "Draft" })));
  } catch (error) {
    console.error("Payroll Preview Error:", error);
    res.status(500).json({ message: "Failed to generate payroll preview" });
  }
};
