import { z } from "zod";

export const sendNotificationSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2, "Title is too short"),
    message: z.string().trim().min(2, "Message is too short"),
    type: z.enum(["info", "warning", "expiry", "maintenance", "ticket", "system"]).optional(),
    scope: z.enum(["all_firms", "firm"]),
    caFirmId: z.string().trim().optional(),
    role: z.string().trim().optional(),
  }),
});
