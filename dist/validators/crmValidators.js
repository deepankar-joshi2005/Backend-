"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLeadNoteSchema = exports.updateLeadSchema = exports.createLeadSchema = void 0;
const zod_1 = require("zod");
const objectId = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
// "" on create means "not set yet" (field simply omitted); on update it means "clear
// it" — coerced to null there, distinct from undefined ("field wasn't sent, leave it").
const optionalDate = zod_1.z.preprocess((v) => (v === "" ? undefined : v), zod_1.z.coerce.date().optional());
const clearableDate = zod_1.z.preprocess((v) => (v === "" ? null : v), zod_1.z.coerce.date().nullable().optional());
const optionalNumber = zod_1.z.preprocess((v) => (v === "" ? undefined : v), zod_1.z.coerce.number().nonnegative().optional());
const clearableNumber = zod_1.z.preprocess((v) => (v === "" ? null : v), zod_1.z.coerce.number().nonnegative().nullable().optional());
const optionalEnum = (values) => zod_1.z.preprocess((v) => (v === "" ? undefined : v), zod_1.z.enum(values).optional());
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
    var _a;
    if (["business", "company"].includes(data.leadType) && !((_a = data.company) === null || _a === void 0 ? void 0 : _a.trim())) {
        ctx.addIssue({ code: "custom", path: ["company"], message: "Business/company name is required for this lead type" });
    }
}
exports.createLeadSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z.string().trim().min(2, "Name is too short"),
        leadType: zod_1.z.enum(LEAD_TYPES, { errorMap: () => ({ message: "Select a lead type" }) }),
        phone: zod_1.z.string().trim().min(6, "A valid mobile number is required"),
        email: zod_1.z.string().trim().toLowerCase().email("Invalid email").optional().or(zod_1.z.literal("")),
        alternatePhone: zod_1.z.string().trim().optional(),
        company: zod_1.z.string().trim().optional(),
        businessType: optionalEnum(BUSINESS_TYPES),
        industry: zod_1.z.string().trim().optional(),
        city: zod_1.z.string().trim().optional(),
        interestedServices: zod_1.z.array(zod_1.z.enum(INTERESTED_SERVICES)).min(1, "Select at least one service"),
        source: zod_1.z.enum(LEAD_SOURCES, { errorMap: () => ({ message: "Select a lead source" }) }),
        assignedTo: objectId.optional().or(zod_1.z.literal("")),
        estimatedValue: optionalNumber,
        priority: zod_1.z.enum(LEAD_PRIORITIES).optional(),
        expectedClosingDate: optionalDate,
        // Follow-up is scheduled afterwards via a dedicated action, not at creation.
        description: zod_1.z.string().trim().optional(),
    })
        .superRefine(requireCompanyNameForBusinessLeads),
});
exports.updateLeadSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z.string().trim().min(2).optional(),
        leadType: zod_1.z.enum(LEAD_TYPES).optional(),
        phone: zod_1.z.string().trim().min(6).optional(),
        email: zod_1.z.string().trim().toLowerCase().email("Invalid email").optional().or(zod_1.z.literal("")),
        alternatePhone: zod_1.z.string().trim().optional(),
        company: zod_1.z.string().trim().optional(),
        businessType: optionalEnum(BUSINESS_TYPES),
        industry: zod_1.z.string().trim().optional(),
        city: zod_1.z.string().trim().optional(),
        interestedServices: zod_1.z.array(zod_1.z.enum(INTERESTED_SERVICES)).min(1, "Select at least one service").optional(),
        source: zod_1.z.enum(LEAD_SOURCES).optional(),
        status: zod_1.z.enum(LEAD_STATUSES).optional(),
        // Optional reason attached to the statusHistory entry (e.g. why a lead was lost).
        statusNote: zod_1.z.string().trim().optional(),
        assignedTo: objectId.optional().or(zod_1.z.literal("")),
        estimatedValue: clearableNumber,
        priority: zod_1.z.enum(LEAD_PRIORITIES).optional(),
        expectedClosingDate: clearableDate,
        followUpDate: clearableDate,
        followUpType: optionalEnum(FOLLOWUP_TYPES),
        followUpNote: zod_1.z.string().trim().optional(),
        description: zod_1.z.string().trim().optional(),
    })
        .superRefine((data, ctx) => {
        if (data.leadType !== undefined)
            requireCompanyNameForBusinessLeads(data, ctx);
    }),
});
exports.addLeadNoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        text: zod_1.z.string().trim().min(1, "Note can't be empty"),
    }),
});
