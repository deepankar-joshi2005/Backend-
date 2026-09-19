"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEmi = calculateEmi;
exports.estimateEligibility = estimateEligibility;
// Standard reducing-balance EMI formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1),
// where r is the monthly rate and n the tenure in months.
function calculateEmi({ principal, annualRate, tenureMonths }) {
    const r = annualRate / 12 / 100;
    const n = tenureMonths;
    if (r === 0) {
        const emi = principal / n;
        return { emi, totalPayment: principal, totalInterest: 0 };
    }
    const factor = Math.pow(1 + r, n);
    const emi = (principal * r * factor) / (factor - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - principal;
    return { emi, totalPayment, totalInterest };
}
// Rule-based estimator (Module Scope doc, Section 5): affordable EMI is a share of
// disposable income (FOIR — Fixed Obligation to Income Ratio), then the EMI formula
// is inverted to back out the loan amount that EMI can support.
function estimateEligibility({ monthlyIncome, monthlyObligations, annualRate, tenureMonths, foirPercent = 50 }) {
    const disposable = Math.max(0, monthlyIncome - monthlyObligations);
    const maxEmi = disposable * (foirPercent / 100);
    const r = annualRate / 12 / 100;
    const n = tenureMonths;
    let maxEligibleAmount;
    if (r === 0) {
        maxEligibleAmount = maxEmi * n;
    }
    else {
        const factor = Math.pow(1 + r, n);
        maxEligibleAmount = (maxEmi * (factor - 1)) / (r * factor);
    }
    return { maxEmi, maxEligibleAmount };
}
