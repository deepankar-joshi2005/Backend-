import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const documentItemSchema = z.object({
  label: z.string().trim().min(1),
  done: z.boolean().optional(),
  fileUrl: z.string().trim().nullable().optional(),
  fileName: z.string().trim().nullable().optional(),
  fileSize: z.number().nullable().optional(),
});

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2, "Title is too short"),
    category: z.enum(["gst", "tds", "roc", "income_tax", "other"]).optional(),
    recurrence: z.enum(["one_time", "monthly", "quarterly", "annual"]).optional(),
    dueDate: z.coerce.date({ errorMap: () => ({ message: "A valid due date is required" }) }),
    clientId: objectId,
    assignedTo: objectId.optional().or(z.literal("")),
    documents: z.array(documentItemSchema).optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).optional(),
    category: z.enum(["gst", "tds", "roc", "income_tax", "other"]).optional(),
    recurrence: z.enum(["one_time", "monthly", "quarterly", "annual"]).optional(),
    dueDate: z.coerce.date().optional(),
    status: z.enum(["pending", "in_progress", "done"]).optional(),
    clientId: objectId.optional(),
    assignedTo: objectId.optional().or(z.literal("")),
    documents: z.array(documentItemSchema).optional(),
  }),
});

export const addTaskNoteSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1, "Note can't be empty"),
  }),
});
