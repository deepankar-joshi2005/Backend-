import { z } from "zod";

// An empty string from a blank <input type="date">/<select> must be treated
// as "not provided" — z.optional() only lets `undefined` through, so without
// this preprocessing step z.coerce.date()/z.enum() would reject "" outright
// (an "optional" field would then only work if the key is missing entirely).
const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

// Indian PAN: 5 letters + 4 digits + 1 letter. Mobile numbers: 10 digits, starting 6-9.
const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN (format: ABCDE1234F)")
  .optional()
  .or(z.literal(""));
const phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
const optionalPhoneSchema = phoneSchema.optional().or(z.literal(""));

export const identifyEmployeeSchema = z.object({
  body: z.object({
    employeeCode: z.string().trim().min(1, "Employee ID is required"),
  }),
});

export const submitEmployeeFormSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    designation: z.string().trim().min(1, "Designation is required"),
    dateOfJoining: z.coerce.date(),
    email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
    fatherOrHusbandName: z.string().trim().optional().or(z.literal("")),
    dateOfBirth: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    gender: z.preprocess(emptyToUndefined, z.enum(["male", "female", "other"]).optional()),
    address: z.string().trim().optional().or(z.literal("")),
    pan: panSchema,
    bankAccountNumber: z.string().trim().optional().or(z.literal("")),
    bankIfsc: z.string().trim().optional().or(z.literal("")),
    bankName: z.string().trim().optional().or(z.literal("")),
    accountHolderName: z.string().trim().optional().or(z.literal("")),
    emergencyContactName: z.string().trim().optional().or(z.literal("")),
    emergencyContactPhone: optionalPhoneSchema,
  }),
});
