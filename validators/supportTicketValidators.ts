import { z } from "zod";

export const createTicketSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(3, "Subject is too short"),
    message: z.string().trim().min(3, "Message is too short"),
    priority: z.enum(["low", "medium", "high"]).optional(),
  }),
});

export const replyTicketSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1, "Reply cannot be empty"),
  }),
});

export const updateTicketStatusSchema = z.object({
  body: z.object({
    status: z.enum(["open", "in_progress", "resolved", "closed"]),
  }),
});
