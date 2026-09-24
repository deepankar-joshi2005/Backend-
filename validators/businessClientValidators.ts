import { z } from "zod";
import { CLIENT_TYPES, SERVICES } from "../models/BusinessClient";

const clientFields = {
  name: z.string().trim().min(2, "Business name is too short"),
  clientType: z.enum(CLIENT_TYPES).optional(),
  pan: z.string().trim().optional().or(z.literal("")),
  gstin: z.string().trim().optional().or(z.literal("")),
  industry: z.string().trim().optional().or(z.literal("")),
  contactPerson: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  pincode: z.string().trim().optional().or(z.literal("")),
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
  phone: z.string().trim().optional().or(z.literal("")),
  designation: z.string().trim().optional().or(z.literal("")),
  dateOfJoining: z.coerce.date().optional(),
  email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
  costCenter: z.string().trim().optional().or(z.literal("")),
  pan: z.string().trim().optional().or(z.literal("")),
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
