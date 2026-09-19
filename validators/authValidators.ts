import { z } from "zod";

export const registerFirmSchema = z.object({
  body: z.object({
    firmName: z.string().trim().min(2, "Firm name is too short"),
    adminName: z.string().trim().min(2, "Name is too short"),
    adminEmail: z.string().trim().toLowerCase().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phone: z.string().trim().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      phone: z.string().trim().optional(),
      email: z.string().trim().toLowerCase().email("Invalid email").optional(),
      currentPassword: z.string().optional(),
    })
    .refine((data) => !data.email || !!data.currentPassword, {
      message: "Current password is required to change email",
      path: ["currentPassword"],
    }),
});
