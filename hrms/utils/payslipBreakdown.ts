/** @format */

/* =====================================================
   Derives the "Attendance" + "Gross Pay Calculation" breakdown shown on the
   Payslip view panel and PDF, from a Payslip doc (with its `payroll` ref
   populated). Purely a display-layer decomposition — it never changes
   payslip.netSalary/deduction, which stay the single source of truth.
===================================================== */

export interface PayslipBreakdown {
  daysInMonth: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  holidayDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lopDays: number;
  effectivePaidDays: number;
  overtimeHours: number;

  basic: number;
  componentEarnings: number;
  totalEarnings: number;
  lopDeductionAmount: number;
  unpaidLeaveDeductionAmount: number;
  overtimeAmount: number;
  encashmentBonus: number;
  grossPay: number;

  hra: number;
  otherAllowance: number;

  professionalTax: number;
  pf: number;
  tds: number;
  advance: number;
  others: number;
  totalComponentDeductions: number;

  netPay: number;
}

export function buildPayslipBreakdown(payslip: any): PayslipBreakdown {
  const payroll: any = payslip.payroll || {};

  const [year, monthNum] = String(payslip.month).split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const halfDays = (payslip.halfDays || 0) + (payslip.lateHalfDays || 0);
  const holidayDays = payroll.holidayDays || 0;
  const weeklyOffDays = payroll.weeklyOffDays || 0;
  const unpaidLeaveDays = payroll.unpaidLeaveDays || 0;
  const lopDays = payroll.lopDays ?? payslip.lopDays ?? 0;
  const overtimeHours = payslip.overtimeHours || 0;

  const workingDays = Math.max(0, daysInMonth - weeklyOffDays - holidayDays);
  const presentDays =
    (payslip.fullDays || 0) + (payslip.lateFullDays || 0) + 0.5 * halfDays;

  const basic = payslip.basic || 0;
  const hra = payslip.hra || 0;
  const otherAllowance = payslip.otherAllowance || 0;
  const componentEarnings = hra + otherAllowance;
  const totalEarnings = basic + componentEarnings;

  const perDayRate = payslip.perDayRate || 0;
  const lopDeductionCombined = payslip.lopDeductionAmount || 0;
  // Split the single stored LOP figure into "pure LOP" vs "unpaid leave" for
  // display — the two always sum back to lopDeductionCombined exactly.
  const unpaidLeaveDeductionAmount = Math.min(
    lopDeductionCombined,
    Math.round(perDayRate * unpaidLeaveDays)
  );
  const lopDeductionAmount = lopDeductionCombined - unpaidLeaveDeductionAmount;

  const overtimeAmount = payslip.overtimeAmount || 0;
  const encashmentBonus = payroll.encashmentBonus || 0;

  const grossPay = totalEarnings + encashmentBonus + overtimeAmount - lopDeductionCombined;

  const professionalTax = payslip.professionalTax || 0;
  const pf = payslip.pf || 0;
  const tds = payslip.tds || 0;
  const advance = payslip.advance || 0;
  const others = payslip.others || 0;
  const totalComponentDeductions = professionalTax + pf + tds + advance + others;

  return {
    daysInMonth,
    workingDays,
    presentDays,
    absentDays: payslip.absentDays || 0,
    halfDays,
    holidayDays,
    paidLeaveDays: payslip.paidLeaveDays || 0,
    unpaidLeaveDays,
    lopDays,
    effectivePaidDays: presentDays,
    overtimeHours,

    basic,
    componentEarnings,
    totalEarnings,
    lopDeductionAmount,
    unpaidLeaveDeductionAmount,
    overtimeAmount,
    encashmentBonus,
    grossPay,

    hra,
    otherAllowance,

    professionalTax,
    pf,
    tds,
    advance,
    others,
    totalComponentDeductions,

    netPay: payslip.netSalary || 0,
  };
}
