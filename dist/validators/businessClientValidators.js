"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetBusinessClientAdminPasswordSchema = exports.updateBusinessClientSchema = exports.createBusinessClientSchema = void 0;
const zod_1 = require("zod");
exports.createBusinessClientSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2, "Business name is too short"),
        email: zod_1.z.string().trim().toLowerCase().email("Invalid email").optional().or(zod_1.z.literal("")),
        phone: zod_1.z.string().trim().optional(),
        adminName: zod_1.z.string().trim().min(2, "Admin name is too short"),
        adminEmail: zod_1.z.string().trim().toLowerCase().email("Invalid admin email"),
        adminPassword: zod_1.z.string().min(8, "Password must be at least 8 characters").optional().or(zod_1.z.literal("")),
    }),
});
exports.updateBusinessClientSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).optional(),
        email: zod_1.z.string().trim().toLowerCase().email("Invalid email").optional().or(zod_1.z.literal("")),
        phone: zod_1.z.string().trim().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.resetBusinessClientAdminPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        newPassword: zod_1.z.string().min(8, "Password must be at least 8 characters").optional().or(zod_1.z.literal("")),
    }),
});
