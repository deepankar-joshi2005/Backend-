import { z } from "zod";

export const updateSettingsSchema = z.object({
  body: z.object({
    platformName: z.string().trim().min(2).optional(),
    supportEmail: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
    maintenanceMode: z.boolean().optional(),
    defaultTrialDays: z.coerce.number().int().min(0).optional(),
    starterPrice: z.coerce.number().min(0).optional(),
    growthPrice: z.coerce.number().min(0).optional(),
    enterprisePrice: z.coerce.number().min(0).optional(),
    currency: z.string().trim().optional(),
  }),
});
