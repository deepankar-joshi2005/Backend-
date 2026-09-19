"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTaskNoteSchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
const objectId = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const documentItemSchema = zod_1.z.object({ label: zod_1.z.string().trim().min(1), done: zod_1.z.boolean().optional() });
exports.createTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(2, "Title is too short"),
        category: zod_1.z.enum(["gst", "tds", "roc", "income_tax", "other"]).optional(),
        recurrence: zod_1.z.enum(["one_time", "monthly", "quarterly", "annual"]).optional(),
        dueDate: zod_1.z.coerce.date({ errorMap: () => ({ message: "A valid due date is required" }) }),
        clientId: objectId,
        assignedTo: objectId.optional().or(zod_1.z.literal("")),
        documents: zod_1.z.array(documentItemSchema).optional(),
    }),
});
exports.updateTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(2).optional(),
        category: zod_1.z.enum(["gst", "tds", "roc", "income_tax", "other"]).optional(),
        recurrence: zod_1.z.enum(["one_time", "monthly", "quarterly", "annual"]).optional(),
        dueDate: zod_1.z.coerce.date().optional(),
        status: zod_1.z.enum(["pending", "in_progress", "done"]).optional(),
        clientId: objectId.optional(),
        assignedTo: objectId.optional().or(zod_1.z.literal("")),
        documents: zod_1.z.array(documentItemSchema).optional(),
    }),
});
exports.addTaskNoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        text: zod_1.z.string().trim().min(1, "Note can't be empty"),
    }),
});
