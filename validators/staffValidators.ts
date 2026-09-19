import { z } from "zod";

export const createStaffSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name is too short"),
    email: z.string().trim().toLowerCase().email("Invalid email"),
    phone: z.string().trim().optional(),
    designation: z.string().trim().optional(),
    icaiMembershipNo: z
      .string()
      .trim()
      .regex(/^\d{5,7}$/, "ICAI membership number must be 5-7 digits")
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  }),
});

export const updateStaffSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    email: z.string().trim().toLowerCase().email("Invalid email").optional(),
    phone: z.string().trim().optional(),
    designation: z.string().trim().optional(),
    icaiMembershipNo: z
      .string()
      .trim()
      .regex(/^\d{5,7}$/, "ICAI membership number must be 5-7 digits")
      .optional()
      .or(z.literal("")),
    isActive: z.boolean().optional(),
  }),
});

export const resetStaffPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  }),
});
