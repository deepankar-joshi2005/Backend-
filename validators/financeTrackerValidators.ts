import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const loanSchema = z.object({
  active: z.boolean().optional(),
  emi: z.coerce.number().nonnegative().optional(),
});

const otherLoanSchema = z.object({
  name: z.string().trim().min(1, "Loan name is required"),
  emi: z.coerce.number().nonnegative().optional(),
});

const expensesSchema = z.object({
  rent: z.coerce.number().nonnegative().optional(),
  groceries: z.coerce.number().nonnegative().optional(),
  utilities: z.coerce.number().nonnegative().optional(),
  transportation: z.coerce.number().nonnegative().optional(),
  insurance: z.coerce.number().nonnegative().optional(),
  education: z.coerce.number().nonnegative().optional(),
  entertainment: z.coerce.number().nonnegative().optional(),
  other: z.coerce.number().nonnegative().optional(),
});

const profileFields = {
  clientModel: z.enum(["BusinessClient", "Lead"]).nullable().optional(),
  clientId: objectId.nullable().optional(),
  name: z.string().trim().min(2, "Name is too short"),
  email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  gstin: z.string().trim().optional().or(z.literal("")),
  company: z.string().trim().optional().or(z.literal("")),
  designation: z.string().trim().optional().or(z.literal("")),
  experienceYears: z.coerce.number().nonnegative().optional(),
  monthlyIncome: z.coerce.number().nonnegative("Monthly income is required"),
  homeLoan: loanSchema.optional(),
  carLoan: loanSchema.optional(),
  personalLoan: loanSchema.optional(),
  otherLoans: z.array(otherLoanSchema).optional(),
  expenses: expensesSchema.optional(),
  currentMonthlySavings: z.coerce.number().nonnegative().optional(),
};

export const createFinanceProfileSchema = z.object({
  body: z.object(profileFields),
});

export const updateFinanceProfileSchema = z.object({
  body: z.object({ ...profileFields, name: profileFields.name.optional(), monthlyIncome: profileFields.monthlyIncome.optional() }),
});

export const projectionSchema = z.object({
  body: z.object({
    monthlyContribution: z.coerce.number().nonnegative(),
    annualReturnPercent: z.coerce.number().nonnegative().max(100),
    horizonYears: z.coerce.number().int().positive().max(50).optional(),
  }),
});
