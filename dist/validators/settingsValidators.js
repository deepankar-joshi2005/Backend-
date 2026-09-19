"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsSchema = void 0;
const zod_1 = require("zod");
exports.updateSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        platformName: zod_1.z.string().trim().min(2).optional(),
        supportEmail: zod_1.z.string().trim().toLowerCase().email("Invalid email").optional().or(zod_1.z.literal("")),
        maintenanceMode: zod_1.z.boolean().optional(),
        defaultTrialDays: zod_1.z.coerce.number().int().min(0).optional(),
        starterPrice: zod_1.z.coerce.number().min(0).optional(),
        growthPrice: zod_1.z.coerce.number().min(0).optional(),
        currency: zod_1.z.string().trim().optional(),
    }),
});
