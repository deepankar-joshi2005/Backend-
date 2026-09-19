"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCalculationSchema = void 0;
const zod_1 = require("zod");
const objectId = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
exports.createCalculationSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        type: zod_1.z.enum(["emi", "eligibility"]),
        label: zod_1.z.string().trim().optional(),
        clientId: objectId,
        annualRate: zod_1.z.coerce.number().positive("Interest rate must be positive"),
        tenureMonths: zod_1.z.coerce.number().int().positive("Tenure must be a positive number of months"),
        principal: zod_1.z.coerce.number().positive().optional(),
        monthlyIncome: zod_1.z.coerce.number().nonnegative().optional(),
        monthlyObligations: zod_1.z.coerce.number().nonnegative().optional(),
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
