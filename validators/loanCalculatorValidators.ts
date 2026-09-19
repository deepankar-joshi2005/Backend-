import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const createCalculationSchema = z.object({
  body: z
    .object({
      type: z.enum(["emi", "eligibility"]),
      label: z.string().trim().optional(),
      clientId: objectId,
      annualRate: z.coerce.number().positive("Interest rate must be positive"),
      tenureMonths: z.coerce.number().int().positive("Tenure must be a positive number of months"),
      principal: z.coerce.number().positive().optional(),
      monthlyIncome: z.coerce.number().nonnegative().optional(),
      monthlyObligations: z.coerce.number().nonnegative().optional(),
    })
    .refine((data) => data.type !== "emi" || data.principal, {
      message: "Principal is required for an EMI calculation",
      path: ["principal"],
    })
    .refine((data) => data.type !== "eligibility" || data.monthlyIncome !== undefined, {
      message: "Monthly income is required for an eligibility estimate",
      path: ["monthlyIncome"],
    }),
});
