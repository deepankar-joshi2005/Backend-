import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
// "" on create means "not set yet" (field simply omitted); on update it means "clear
// it" — coerced to null there, distinct from undefined ("field wasn't sent, leave it").
const optionalDate = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional());
const clearableDate = z.preprocess((v) => (v === "" ? null : v), z.coerce.date().nullable().optional());
const optionalNumber = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().nonnegative().optional());
const clearableNumber = z.preprocess((v) => (v === "" ? null : v), z.coerce.number().nonnegative().nullable().optional());
const optionalEnum = (values) => z.preprocess((v) => (v === "" ? undefined : v), z.enum(values).optional());
// Indian mobile numbers: 10 digits, starting 6-9.
const phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
const optionalPhoneSchema = phoneSchema.optional().or(z.literal(""));

const LEAD_TYPES = ["individual", "business", "startup", "company", "existing_client_referral"];
const BUSINESS_TYPES = ["proprietorship", "partnership", "llp", "private_limited", "other"];
const INTERESTED_SERVICES = [
  "gst_registration",
  "gst_filing",
  "income_tax_return",
  "tax_consultation",
  "accounting_bookkeeping",
  "roc_compliance",
  "audit",
  "tds",
  "financial_statements",
  "loan_advisory",
  "other",
];
const LEAD_SOURCES = ["website", "phone_call", "whatsapp", "email", "referral", "social_media", "advertisement", "walk_in", "other"];
const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"];
const LEAD_PRIORITIES = ["low", "medium", "high"];
const FOLLOWUP_TYPES = ["call", "email", "whatsapp", "meeting"];

// Business/Company Name is only mandatory when the lead is itself a business or company.
function requireCompanyNameForBusinessLeads(data, ctx) {
  if (["business", "company"].includes(data.leadType) && !data.company?.trim()) {
    ctx.addIssue({ code: "custom", path: ["company"], message: "Business/company name is required for this lead type" });
  }
}

export const createLeadSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, "Name is too short"),
      leadType: z.enum(LEAD_TYPES, { errorMap: () => ({ message: "Select a lead type" }) }),
      phone: phoneSchema,
      email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
      alternatePhone: optionalPhoneSchema,

      company: z.string().trim().optional(),
      businessType: optionalEnum(BUSINESS_TYPES),
      industry: z.string().trim().optional(),
      city: z.string().trim().optional(),

      interestedServices: z.array(z.enum(INTERESTED_SERVICES)).min(1, "Select at least one service"),
      source: z.enum(LEAD_SOURCES, { errorMap: () => ({ message: "Select a lead source" }) }),
      assignedTo: objectId.optional().or(z.literal("")),

      estimatedValue: optionalNumber,
      priority: z.enum(LEAD_PRIORITIES).optional(),
      expectedClosingDate: optionalDate,

      // Follow-up is scheduled afterwards via a dedicated action, not at creation.
      description: z.string().trim().optional(),
    })
    .superRefine(requireCompanyNameForBusinessLeads),
});

export const updateLeadSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      leadType: z.enum(LEAD_TYPES).optional(),
      phone: optionalPhoneSchema,
      email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
      alternatePhone: optionalPhoneSchema,

      company: z.string().trim().optional(),
      businessType: optionalEnum(BUSINESS_TYPES),
      industry: z.string().trim().optional(),
      city: z.string().trim().optional(),

      interestedServices: z.array(z.enum(INTERESTED_SERVICES)).min(1, "Select at least one service").optional(),
      source: z.enum(LEAD_SOURCES).optional(),
      status: z.enum(LEAD_STATUSES).optional(),
      // Optional reason attached to the statusHistory entry (e.g. why a lead was lost).
      statusNote: z.string().trim().optional(),
      assignedTo: objectId.optional().or(z.literal("")),

      estimatedValue: clearableNumber,
      priority: z.enum(LEAD_PRIORITIES).optional(),
      expectedClosingDate: clearableDate,

      followUpDate: clearableDate,
      followUpType: optionalEnum(FOLLOWUP_TYPES),
      followUpNote: z.string().trim().optional(),
      description: z.string().trim().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.leadType !== undefined) requireCompanyNameForBusinessLeads(data, ctx);
    }),
});

export const addLeadNoteSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1, "Note can't be empty"),
  }),
});
