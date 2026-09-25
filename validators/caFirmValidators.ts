import { z } from "zod";

const addressSchema = z
  .object({
    line1: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
    country: z.string().trim().optional(),
  })
  .optional();

// Indian PAN: 5 letters + 4 digits + 1 letter. GSTIN: 15-char state-wise registration built on the PAN.
const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN (format: ABCDE1234F)")
  .optional()
  .or(z.literal(""));
const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/, "Invalid GSTIN")
  .optional()
  .or(z.literal(""));
// Indian mobile numbers: 10 digits, starting 6-9.
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
  .optional()
  .or(z.literal(""));

export const createCaFirmSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Firm name is too short"),
    email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
    phone: phoneSchema,
    icaiRegistrationNumber: z.string().trim().min(5, "Enter a valid ICAI firm registration number (FRN)").optional().or(z.literal("")),
    constitutionType: z.enum(["proprietorship", "partnership", "llp"], {
      errorMap: () => ({ message: "Select the firm's constitution type" }),
    }),
    pan: panSchema,
    gstin: gstinSchema,
    address: addressSchema,
    planTier: z.enum(["starter", "growth", "enterprise"]).optional(),
    billingCycle: z.enum(["monthly", "annual"]).optional(),
    adminName: z.string().trim().min(2, "Admin name is too short"),
    adminEmail: z.string().trim().toLowerCase().email("Invalid admin email"),
    adminPassword: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
    adminDesignation: z.enum(["proprietor", "partner", "director", "authorized_signatory"], {
      errorMap: () => ({ message: "Select the admin's designation" }),
    }),
    adminMembershipNo: z
      .string()
      .trim()
      .regex(/^\d{5,7}$/, "ICAI membership number must be 5-7 digits")
      .optional()
      .or(z.literal("")),
  }),
});

export const updateCaFirmSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
    phone: phoneSchema,
    // "" means "leave unchanged" here (the edit form always sends these keys, even
    // when the firm has no value yet) — transform it away instead of failing validation.
    icaiRegistrationNumber: z
      .string()
      .trim()
      .min(5, "Enter a valid ICAI firm registration number (FRN)")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
    constitutionType: z
      .union([z.enum(["proprietorship", "partnership", "llp"]), z.literal("")])
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    pan: panSchema,
    gstin: gstinSchema,
    address: addressSchema,
    isActive: z.boolean().optional(),
  }),
});

export const updateSubscriptionSchema = z.object({
  body: z.object({
    tier: z.enum(["starter", "growth", "enterprise"]).optional(),
    status: z.enum(["trial", "active", "suspended", "expired"]).optional(),
    billingCycle: z.enum(["monthly", "annual"]).optional(),
    expiryDate: z.coerce.date().optional(),
  }),
});

export const createSubscriptionOrderSchema = z.object({
  body: z.object({
    tier: z.enum(["starter", "growth", "enterprise"], { errorMap: () => ({ message: "Select a plan" }) }),
    billingCycle: z.enum(["monthly", "annual"]).optional().default("monthly"),
  }),
});

export const verifySubscriptionPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),
});

export const resetAdminPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  }),
});
