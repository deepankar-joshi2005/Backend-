import { estimateEligibility } from "./loanMath";

interface LoanLike {
  active?: boolean;
  emi?: number;
}

interface FinanceInputs {
  monthlyIncome: number;
  homeLoan?: LoanLike;
  carLoan?: LoanLike;
  personalLoan?: LoanLike;
  otherLoans?: { emi?: number }[];
  expenses?: {
    rent?: number;
    groceries?: number;
    utilities?: number;
    transportation?: number;
    insurance?: number;
    education?: number;
    entertainment?: number;
    other?: number;
  };
}

export type HealthStatus = "Excellent" | "Good" | "Moderate" | "Stressed";

const HEALTH_LABELS: Record<HealthStatus, string> = {
  Excellent: "Low debt burden and healthy savings — well positioned for new goals.",
  Good: "Comfortable obligation level — steady financial footing.",
  Moderate: "Approaching a healthy limit on fixed obligations — borrow cautiously.",
  Stressed: "Fixed obligations are high relative to income — avoid new loans for now.",
};

function n(v: number | undefined | null) {
  return Number(v) || 0;
}

export function totalActiveEmi(inputs: FinanceInputs) {
  const fixed = [inputs.homeLoan, inputs.carLoan, inputs.personalLoan]
    .filter((l) => l?.active)
    .reduce((sum, l) => sum + n(l!.emi), 0);
  const other = (inputs.otherLoans || []).reduce((sum, l) => sum + n(l.emi), 0);
  return fixed + other;
}

export function totalExpenses(inputs: FinanceInputs) {
  const e = inputs.expenses || {};
  return n(e.rent) + n(e.groceries) + n(e.utilities) + n(e.transportation) + n(e.insurance) + n(e.education) + n(e.entertainment) + n(e.other);
}

function healthStatus(foir: number): HealthStatus {
  if (foir < 30) return "Excellent";
  if (foir < 40) return "Good";
  if (foir < 50) return "Moderate";
  return "Stressed";
}

// Core per-profile financial snapshot — FOIR (Fixed Obligation to Income Ratio) is
// the standard banking metric this is built on: total EMI outflow as a % of income.
export function computeFinanceSnapshot(inputs: FinanceInputs) {
  const monthlyIncome = n(inputs.monthlyIncome);
  const totalEmi = totalActiveEmi(inputs);
  const totalExp = totalExpenses(inputs);
  const totalOutflow = totalEmi + totalExp;
  const surplus = monthlyIncome - totalOutflow;
  const foir = monthlyIncome > 0 ? (totalEmi / monthlyIncome) * 100 : 0;
  const savingsRate = monthlyIncome > 0 ? (surplus / monthlyIncome) * 100 : 0;
  const status = healthStatus(foir);

  return {
    monthlyIncome,
    totalEmi,
    totalExpenses: totalExp,
    totalOutflow,
    surplus,
    foir: Math.round(foir * 10) / 10,
    savingsRate: Math.round(savingsRate * 10) / 10,
    healthStatus: status,
    healthMessage: HEALTH_LABELS[status],
  };
}

// How much MORE EMI (and therefore loan) this person could take on before hitting
// targetFoirPercent overall — reuses the existing FOIR-based estimateEligibility
// formula from loanMath.ts rather than reimplementing the amount-from-EMI math.
export function computeLoanEligibility(
  inputs: FinanceInputs,
  { annualRate = 10.5, tenureMonths = 60, targetFoirPercent = 50 }: { annualRate?: number; tenureMonths?: number; targetFoirPercent?: number } = {}
) {
  const monthlyIncome = n(inputs.monthlyIncome);
  const totalEmi = totalActiveEmi(inputs);
  const { maxEmi, maxEligibleAmount } = estimateEligibility({
    monthlyIncome,
    monthlyObligations: totalEmi,
    annualRate,
    tenureMonths,
    foirPercent: targetFoirPercent,
  });
  return {
    additionalEmiCapacity: Math.round(maxEmi),
    maxEligibleLoan: Math.round(maxEligibleAmount),
    annualRate,
    tenureMonths,
    targetFoirPercent,
  };
}

// Future value of a monthly SIP-style contribution — FV = P * [((1+r)^n - 1)/r] * (1+r).
// Illustrative only: real returns vary, this is not a guarantee.
export function projectInvestmentValue(monthlyContribution: number, annualReturnPercent: number, months: number) {
  const P = n(monthlyContribution);
  const r = n(annualReturnPercent) / 12 / 100;
  if (months <= 0) return 0;
  if (r === 0) return Math.round(P * months);
  const factor = Math.pow(1 + r, months);
  return Math.round(P * ((factor - 1) / r) * (1 + r));
}

export const PROJECTION_HORIZONS_YEARS = [1, 3, 5, 10];
