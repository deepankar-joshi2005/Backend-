"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetStaffPasswordSchema = exports.updateStaffSchema = exports.createStaffSchema = void 0;
const zod_1 = require("zod");
exports.createStaffSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2, "Name is too short"),
        email: zod_1.z.string().trim().toLowerCase().email("Invalid email"),
        phone: zod_1.z.string().trim().optional(),
        designation: zod_1.z.string().trim().optional(),
        icaiMembershipNo: zod_1.z
            .string()
            .trim()
            .regex(/^\d{5,7}$/, "ICAI membership number must be 5-7 digits")
            .optional()
            .or(zod_1.z.literal("")),
        password: zod_1.z.string().min(8, "Password must be at least 8 characters").optional().or(zod_1.z.literal("")),
    }),
});
exports.updateStaffSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).optional(),
        email: zod_1.z.string().trim().toLowerCase().email("Invalid email").optional(),
        phone: zod_1.z.string().trim().optional(),
        designation: zod_1.z.string().trim().optional(),
        icaiMembershipNo: zod_1.z
            .string()
            .trim()
            .regex(/^\d{5,7}$/, "ICAI membership number must be 5-7 digits")
            .optional()
            .or(zod_1.z.literal("")),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.resetStaffPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        newPassword: zod_1.z.string().min(8, "Password must be at least 8 characters").optional().or(zod_1.z.literal("")),
    }),
});
