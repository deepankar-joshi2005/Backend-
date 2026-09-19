/** @format */

import { Response } from "express";
import mongoose from "mongoose";
import Payroll from "../../models/hrms/Payroll";
import PayrollRun, { PayrollRunStatus } from "../../models/hrms/PayrollRun";
import SalaryStructure from "../../models/hrms/SalaryStructure";
import User from "../../models/User";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";
import { monthBounds, defaultRunTitle } from "../../utils/payrollRunHelpers";
import { runPayrollForMonth, buildPayrollBreakdownsForMonth } from "./payrollController";

const isScoped = (req: AuthRequest) =>
  !req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin;

async function relevantCompanyIds(req: AuthRequest): Promise<string[]> {
  if (isScoped(req)) return [String(req.user.companyId)];
  const ids = await User.distinct("companyId", { status: "ACTIVE" });
  return ids.map((id) => String(id));
}

async function ensureRunDoc(companyId: string, month: string, statusIfNew: PayrollRunStatus = "Draft") {
  let run = await PayrollRun.findOne({ companyId, month });
  if (!run) {
    const { start, end } = monthBounds(month);
    run = await PayrollRun.create({
      companyId,
      month,
      title: defaultRunTitle(month),
      frequency: "Monthly",
      payPeriodStart: start,
      payPeriodEnd: end,
      status: statusIfNew,
    });
  }
  return run;
}

/* ================= LIST PAYROLL RUNS ================= */
export const listPayrollRuns = async (req: AuthRequest, res: Response) => {
  try {
    const scoped = isScoped(req);
    const currentMonth = new Date().toISOString().slice(0, 7);

    const companyIds = await relevantCompanyIds(req);
    await Promise.all(companyIds.map((cid) => ensureRunDoc(cid, currentMonth, "Draft")));

    // Backfill: any company+month with Payroll data but no run doc yet (pre-existing history)
    const payrollScope: any = {};
    if (scoped) payrollScope.companyId = req.user.companyId;

    const monthCompanyPairs = await Payroll.aggregate([
      { $match: payrollScope },
      { $group: { _id: { month: "$month", companyId: "$companyId" } } },
    ]);

    for (const pair of monthCompanyPairs) {
      const { month, companyId } = pair._id;
      const exists = await PayrollRun.findOne({ companyId, month });
      if (exists) continue;

      const remaining = await Payroll.countDocuments({ month, companyId, status: { $ne: "Paid" } });
      const { start, end } = monthBounds(month);
      await PayrollRun.create({
        companyId,
        month,
        title: defaultRunTitle(month),
        frequency: "Monthly",
        payPeriodStart: start,
        payPeriodEnd: end,
        status: remaining === 0 ? "Completed" : "Processing",
      });
    }

    const runFilter: any = {};
    if (scoped) runFilter.companyId = req.user.companyId;

    const runs = await PayrollRun.find(runFilter).sort({ month: -1 }).lean();

    const summaryMatch: any = {};
    if (scoped) summaryMatch.companyId = new mongoose.Types.ObjectId(req.user.companyId);

    const summaries = await Payroll.aggregate([
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

    const summaryMap = new Map(
      summaries.map((s: any) => [`${s._id.month}_${String(s._id.companyId)}`, s])
    );

    // Draft runs have no persisted Payroll rows yet (nothing has been "Run" for them).
    // Instead of showing 0/0/0, compute a live, unsaved preview from attendance-to-date
    // — the same engine the old preview screen used — so HR can see what's accruing
    // this month before actually running payroll.
    const draftMonths = Array.from(new Set(runs.filter((r: any) => r.status === "Draft").map((r: any) => r.month)));
    const previewByKey = new Map<string, { employees: number; gross: number; deduction: number; net: number }>();

    for (const draftMonth of draftMonths) {
      const results = await buildPayrollBreakdownsForMonth(req, draftMonth as string);
      for (const run of runs) {
        if (run.status !== "Draft" || run.month !== draftMonth) continue;
        const forThisCompany = results.filter((r) => String(r.companyId) === String(run.companyId));
        previewByKey.set(`${run.month}_${String(run.companyId)}`, {
          employees: forThisCompany.length,
          gross: forThisCompany.reduce((s, r) => s + r.breakdown.gross, 0),
          deduction: forThisCompany.reduce((s, r) => s + r.breakdown.deduction, 0),
          net: forThisCompany.reduce((s, r) => s + r.breakdown.net, 0),
        });
      }
    }

    const payload = runs.map((run: any) => {
      const key = `${run.month}_${String(run.companyId)}`;
      if (run.status === "Draft") {
        const preview = previewByKey.get(key) || { employees: 0, gross: 0, deduction: 0, net: 0 };
        return { ...run, ...preview, isLivePreview: true };
      }
      const summary = summaryMap.get(key);
      return {
        ...run,
        employees: summary?.employees || 0,
        gross: summary?.gross || 0,
        deduction: summary?.deduction || 0,
        net: summary?.net || 0,
      };
    });

    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch payroll runs" });
  }
};

/* ================= GET PAYROLL RUN DETAIL ================= */
export const getPayrollRunDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.params;
    const scoped = isScoped(req);

    const runFilter: any = { month };
    if (scoped) runFilter.companyId = req.user.companyId;

    const run = await PayrollRun.findOne(runFilter).lean();
    if (!run) {
      return res.status(404).json({ message: "Payroll run not found for this month" });
    }

    const isLivePreview = (run as any).status === "Draft";
    let entries: any[];

    if (isLivePreview) {
      // Nothing has been "Run" for this month yet — compute a live, unsaved preview
      // from attendance-to-date (same engine as /payroll/preview) instead of reading
      // the (still empty) Payroll collection.
      const results = await buildPayrollBreakdownsForMonth(req, month);
      const forThisCompany = results.filter((r) => String(r.companyId) === String((run as any).companyId));

      const employeeIds = forThisCompany.map((r) => r.breakdown.userId);
      const salaryStructures = await SalaryStructure.find({ employee: { $in: employeeIds } }).lean();
      const salaryByEmployee = new Map(salaryStructures.map((s: any) => [String(s.employee), s]));

      entries = forThisCompany.map(({ breakdown }) => {
        const salary = salaryByEmployee.get(String(breakdown.userId));
        return {
          payrollId: `preview-${breakdown.userId}`,
          employeeId: breakdown.userId,
          name: breakdown.name,
          employeeCode: breakdown.employeeId,
          status: "Draft",
          basic: salary?.basic || 0,
          hra: salary?.hra || 0,
          otherAllowance: salary?.otherAllowance || 0,
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
    } else {
      const payrolls = await Payroll.find({ month, companyId: (run as any).companyId })
        .populate("employee", "name email employeeId role")
        .sort({ createdAt: -1 })
        .lean();

      const employeeIds = payrolls.map((p: any) => p.employee?._id).filter(Boolean);
      const salaryStructures = await SalaryStructure.find({ employee: { $in: employeeIds } }).lean();
      const salaryByEmployee = new Map(salaryStructures.map((s: any) => [String(s.employee), s]));

      entries = payrolls
        .filter((p: any) => p.employee)
        .map((p: any) => {
          const salary = salaryByEmployee.get(String(p.employee._id));
          return {
            payrollId: p._id,
            employeeId: p.employee._id,
            name: p.employee.name,
            employeeCode: p.employee.employeeId,
            status: p.status,
            basic: salary?.basic || 0,
            hra: salary?.hra || 0,
            otherAllowance: salary?.otherAllowance || 0,
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

    const summary = entries.reduce(
      (acc, e) => ({
        employees: acc.employees + 1,
        gross: acc.gross + (e.gross || 0),
        deduction: acc.deduction + (e.deduction || 0),
        net: acc.net + (e.net || 0),
      }),
      { employees: 0, gross: 0, deduction: 0, net: 0 }
    );

    res.json({ run, summary, entries, isLivePreview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch payroll run detail" });
  }
};

/* ================= UPDATE PAY PERIOD / PAY DATE ================= */
export const updatePayrollRunSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.params;
    const { payPeriodStart, payPeriodEnd, payDate } = req.body;
    const scoped = isScoped(req);

    const filter: any = { month };
    if (scoped) filter.companyId = req.user.companyId;

    const run = await PayrollRun.findOne(filter);
    if (!run) {
      return res.status(404).json({ message: "Payroll run not found for this month" });
    }

    const nextStart = payPeriodStart || run.payPeriodStart;
    const nextEnd = payPeriodEnd || run.payPeriodEnd;
    if (nextStart > nextEnd) {
      return res.status(400).json({ message: "Pay period start must be on or before the end date" });
    }

    if (payPeriodStart) run.payPeriodStart = payPeriodStart;
    if (payPeriodEnd) run.payPeriodEnd = payPeriodEnd;
    if (payDate !== undefined) run.payDate = payDate || undefined;

    await run.save();
    res.json(run);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update payroll run schedule" });
  }
};

/* ================= RUN PAYROLL FOR A MONTH ================= */
export const runPayrollRunForMonth = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.params;
    await runPayrollForMonth(req, month);

    const scoped = isScoped(req);
    const scopeFilter: any = { month };
    if (scoped) scopeFilter.companyId = req.user.companyId;

    const companyIds = await Payroll.distinct("companyId", scopeFilter);

    for (const companyId of companyIds) {
      const run = await ensureRunDoc(String(companyId), month, "Processing");
      if (run.status !== "Processing") {
        run.status = "Processing";
        run.generatedBy = req.user.isCaProxy ? "CA" : "Company";
        await run.save();
      }
    }

    res.json({ message: "Payroll processed successfully" });
  } catch (error: any) {
    console.error(error);
    if (error.message === "No employees with a salary structure found for this month") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to run payroll" });
  }
};

/* ================= CANCEL PAYROLL RUN ================= */
export const cancelPayrollRunForMonth = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.params;
    const scoped = isScoped(req);

    const filter: any = { month };
    if (scoped) filter.companyId = req.user.companyId;

    const run = await PayrollRun.findOne(filter);
    if (!run) {
      return res.status(404).json({ message: "Payroll run not found for this month" });
    }

    if (run.status === "Completed") {
      return res.status(400).json({ message: "Cannot cancel a completed payroll run." });
    }

    const paidExists = await Payroll.findOne({ month, companyId: run.companyId, status: "Paid" });
    if (paidExists) {
      return res.status(400).json({ message: "Cannot cancel. Some salaries are already paid." });
    }

    await Payroll.deleteMany({ month, companyId: run.companyId });

    run.status = "Cancelled";
    await run.save();

    res.json({ message: `Payroll run cancelled for ${month}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to cancel payroll run" });
  }
};
