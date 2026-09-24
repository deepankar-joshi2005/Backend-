import { z } from "zod";

// An empty string from a blank <input type="date">/<select> must be treated
// as "not provided" — z.optional() only lets `undefined` through, so without
// this preprocessing step z.coerce.date()/z.enum() would reject "" outright
// (an "optional" field would then only work if the key is missing entirely).
const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

export const identifyEmployeeSchema = z.object({
  body: z.object({
    employeeCode: z.string().trim().min(1, "Employee ID is required"),
  }),
});

export const submitEmployeeFormSchema = z.object({
  body: z.object({
    phone: z.string().trim().min(6, "Enter a valid phone number"),
    designation: z.string().trim().min(1, "Designation is required"),
    dateOfJoining: z.coerce.date(),
    email: z.string().trim().toLowerCase().email("Invalid email").optional().or(z.literal("")),
    fatherOrHusbandName: z.string().trim().optional().or(z.literal("")),
    dateOfBirth: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    gender: z.preprocess(emptyToUndefined, z.enum(["male", "female", "other"]).optional()),
    address: z.string().trim().optional().or(z.literal("")),
    pan: z.string().trim().optional().or(z.literal("")),
    bankAccountNumber: z.string().trim().optional().or(z.literal("")),
    bankIfsc: z.string().trim().optional().or(z.literal("")),
    bankName: z.string().trim().optional().or(z.literal("")),
    accountHolderName: z.string().trim().optional().or(z.literal("")),
    emergencyContactName: z.string().trim().optional().or(z.literal("")),
    emergencyContactPhone: z.string().trim().optional().or(z.literal("")),
  }),
});
