import { z } from "zod";
import { CLIENT_TYPES, SERVICES } from "../models/BusinessClient";

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
const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode")
  .optional()
  .or(z.literal(""));

const clientFields = {
  name: z.string().trim().min(2, "Business name is too short"),
  clientName: z.string().trim().optional().or(z.literal("")),
  clientType: z.enum(CLIENT_TYPES).optional(),
  pan: panSchema,
  gstin: gstinSchema,
  industry: z.string().trim().optional().or(z.literal("")),
  contactPerson: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
  phone: phoneSchema,
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  pincode: pincodeSchema,
  services: z.array(z.enum(SERVICES)).optional(),
};

export const createBusinessClientSchema = z.object({
  body: z.object({
    ...clientFields,
    useHrms: z.boolean().optional(),
    adminName: z.string().trim().min(2, "Admin name is too short").optional().or(z.literal("")),
    adminEmail: z.string().trim().toLowerCase().email("Invalid admin email").optional().or(z.literal("")),
    adminPassword: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
    // Required in the controller when useHrms is true — an HrmsPlanTier id.
    planTierId: z.string().trim().optional().or(z.literal("")),
    // Set when provisioning HRMS for an already-converted CRM lead, instead of
    // a from-scratch business client — see createBusinessClient.
    leadId: z.string().trim().optional().or(z.literal("")),
  }),
});

export const updateBusinessClientSchema = z.object({
  body: z.object({
    ...clientFields,
    name: clientFields.name.optional(),
    isActive: z.boolean().optional(),
  }),
});

export const resetBusinessClientAdminPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  }),
});

export const upgradeToHrmsSchema = z.object({
  body: z.object({
    adminName: z.string().trim().min(2, "Admin name is too short").optional().or(z.literal("")),
    adminEmail: z.string().trim().toLowerCase().email("Invalid admin email").optional().or(z.literal("")),
    adminPassword: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
    planTierId: z.string().trim().min(1, "Select an HRMS plan"),
  }),
});

const clientEmployeeFields = {
  name: z.string().trim().min(2, "Name is too short"),
  phone: phoneSchema,
  designation: z.string().trim().optional().or(z.literal("")),
  dateOfJoining: z.coerce.date().optional(),
  email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
  costCenter: z.string().trim().optional().or(z.literal("")),
  pan: panSchema,
  bankAccountNumber: z.string().trim().optional().or(z.literal("")),
  bankIfsc: z.string().trim().optional().or(z.literal("")),
  bankName: z.string().trim().optional().or(z.literal("")),
  accountHolderName: z.string().trim().optional().or(z.literal("")),
};

export const createMyEmployeeSchema = z.object({
  body: z.object(clientEmployeeFields),
});

export const updateMyEmployeeSchema = z.object({
  body: z.object({
    ...clientEmployeeFields,
    name: clientEmployeeFields.name.optional(),
    isActive: z.boolean().optional(),
  }),
});
