"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicketStatusSchema = exports.replyTicketSchema = exports.createTicketSchema = void 0;
const zod_1 = require("zod");
exports.createTicketSchema = zod_1.z.object({
    body: zod_1.z.object({
        subject: zod_1.z.string().trim().min(3, "Subject is too short"),
        message: zod_1.z.string().trim().min(3, "Message is too short"),
        priority: zod_1.z.enum(["low", "medium", "high"]).optional(),
    }),
});
exports.replyTicketSchema = zod_1.z.object({
    body: zod_1.z.object({
        text: zod_1.z.string().trim().min(1, "Reply cannot be empty"),
    }),
});
exports.updateTicketStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(["open", "in_progress", "resolved", "closed"]),
    }),
});
