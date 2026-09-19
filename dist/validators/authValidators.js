"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.changePasswordSchema = exports.loginSchema = exports.registerFirmSchema = void 0;
const zod_1 = require("zod");
exports.registerFirmSchema = zod_1.z.object({
    body: zod_1.z.object({
        firmName: zod_1.z.string().trim().min(2, "Firm name is too short"),
        adminName: zod_1.z.string().trim().min(2, "Name is too short"),
        adminEmail: zod_1.z.string().trim().toLowerCase().email("Invalid email"),
        password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
        phone: zod_1.z.string().trim().optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().trim().toLowerCase().email("Invalid email"),
        password: zod_1.z.string().min(1, "Password is required"),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, "Current password is required"),
        newPassword: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    }),
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z.string().trim().min(2).optional(),
        phone: zod_1.z.string().trim().optional(),
        email: zod_1.z.string().trim().toLowerCase().email("Invalid email").optional(),
        currentPassword: zod_1.z.string().optional(),
    })
        .refine((data) => !data.email || !!data.currentPassword, {
        message: "Current password is required to change email",
        path: ["currentPassword"],
    }),
});
