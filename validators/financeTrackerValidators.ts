import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
  .optional()
  .or(z.literal(""));
const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/, "Invalid GSTIN")
  .optional()
  .or(z.literal(""));

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
  phone: phoneSchema,
  gstin: gstinSchema,
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

// "Send Report" — Module Scope doc, Section 6.1 (Loan Calculator → Personal
// Finance Tracker result sharing via WhatsApp/email). The PDF is the same one
// "Download Report" builds client-side, sent base64-encoded.
export const shareReportSchema = z.object({
  body: z.object({
    channels: z.array(z.enum(["email", "whatsapp"])).min(1, "Pick at least one channel"),
    pdfBase64: z.string().max(15_000_000, "Report PDF is too large").optional(),
    fileName: z.string().trim().max(120).optional(),
    annualRate: z.coerce.number().positive().max(50).optional(),
    tenureMonths: z.coerce.number().int().positive().max(480).optional(),
  }),
});
