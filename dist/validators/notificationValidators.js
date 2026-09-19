"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationSchema = void 0;
const zod_1 = require("zod");
exports.sendNotificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(2, "Title is too short"),
        message: zod_1.z.string().trim().min(2, "Message is too short"),
        type: zod_1.z.enum(["info", "warning", "expiry", "maintenance", "ticket", "system"]).optional(),
        scope: zod_1.z.enum(["all_firms", "firm"]),
        caFirmId: zod_1.z.string().trim().optional(),
        role: zod_1.z.string().trim().optional(),
    }),
});
