"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAdminPasswordSchema = exports.subscriptionRequestSchema = exports.updateSubscriptionSchema = exports.updateCaFirmSchema = exports.createCaFirmSchema = void 0;
const zod_1 = require("zod");
const addressSchema = zod_1.z
    .object({
    line1: zod_1.z.string().trim().optional(),
    city: zod_1.z.string().trim().optional(),
    state: zod_1.z.string().trim().optional(),
    pincode: zod_1.z.string().trim().optional(),
    country: zod_1.z.string().trim().optional(),
})
    .optional();
// Indian PAN: 5 letters + 4 digits + 1 letter. GSTIN: 15-char state-wise registration built on the PAN.
const panSchema = zod_1.z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN (format: ABCDE1234F)")
    .optional()
    .or(zod_1.z.literal(""));
const gstinSchema = zod_1.z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/, "Invalid GSTIN")
    .optional()
    .or(zod_1.z.literal(""));
exports.createCaFirmSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2, "Firm name is too short"),
        email: zod_1.z.string().trim().toLowerCase().email("Invalid email").optional().or(zod_1.z.literal("")),
        phone: zod_1.z.string().trim().optional(),
        icaiRegistrationNumber: zod_1.z.string().trim().min(5, "Enter a valid ICAI firm registration number (FRN)").optional().or(zod_1.z.literal("")),
        constitutionType: zod_1.z.enum(["proprietorship", "partnership", "llp"], {
            errorMap: () => ({ message: "Select the firm's constitution type" }),
        }),
        pan: panSchema,
        gstin: gstinSchema,
        address: addressSchema,
        planTier: zod_1.z.enum(["starter", "growth", "enterprise"]).optional(),
        billingCycle: zod_1.z.enum(["monthly", "annual"]).optional(),
        adminName: zod_1.z.string().trim().min(2, "Admin name is too short"),
        adminEmail: zod_1.z.string().trim().toLowerCase().email("Invalid admin email"),
        adminPassword: zod_1.z.string().min(8, "Password must be at least 8 characters").optional().or(zod_1.z.literal("")),
        adminDesignation: zod_1.z.enum(["proprietor", "partner", "director", "authorized_signatory"], {
            errorMap: () => ({ message: "Select the admin's designation" }),
        }),
        adminMembershipNo: zod_1.z
            .string()
            .trim()
            .regex(/^\d{5,7}$/, "ICAI membership number must be 5-7 digits")
            .optional()
            .or(zod_1.z.literal("")),
    }),
});
exports.updateCaFirmSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).optional(),
        email: zod_1.z.string().trim().toLowerCase().email("Invalid email").optional().or(zod_1.z.literal("")),
        phone: zod_1.z.string().trim().optional(),
        // "" means "leave unchanged" here (the edit form always sends these keys, even
        // when the firm has no value yet) — transform it away instead of failing validation.
        icaiRegistrationNumber: zod_1.z
            .string()
            .trim()
            .min(5, "Enter a valid ICAI firm registration number (FRN)")
            .optional()
            .or(zod_1.z.literal(""))
            .transform((v) => (v === "" ? undefined : v)),
        constitutionType: zod_1.z
            .union([zod_1.z.enum(["proprietorship", "partnership", "llp"]), zod_1.z.literal("")])
            .optional()
            .transform((v) => (v === "" ? undefined : v)),
        pan: panSchema,
        gstin: gstinSchema,
        address: addressSchema,
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.updateSubscriptionSchema = zod_1.z.object({
    body: zod_1.z.object({
        tier: zod_1.z.enum(["starter", "growth", "enterprise"]).optional(),
        status: zod_1.z.enum(["trial", "active", "suspended", "expired"]).optional(),
        billingCycle: zod_1.z.enum(["monthly", "annual"]).optional(),
        expiryDate: zod_1.z.coerce.date().optional(),
    }),
});
exports.subscriptionRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        tier: zod_1.z.enum(["starter", "growth", "enterprise"], { errorMap: () => ({ message: "Select a plan" }) }),
        billingCycle: zod_1.z.enum(["monthly", "annual"]).optional().default("monthly"),
    }),
});
exports.resetAdminPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        newPassword: zod_1.z.string().min(8, "Password must be at least 8 characters").optional().or(zod_1.z.literal("")),
    }),
});
