import mongoose from "mongoose";
import ClientPayrollFirmSettings from "../models/ClientPayrollFirmSettings";
import ClientEmployee from "../models/ClientEmployee";

export async function getOrCreateFirmPayrollSettings(caFirmId: string | mongoose.Types.ObjectId) {
  let settings = await ClientPayrollFirmSettings.findOne({ caFirmId });
  if (!settings) {
    settings = await ClientPayrollFirmSettings.create({ caFirmId });
  }
  return settings;
}

function initials(text: string, len = 3) {
  const letters = String(text || "").replace(/[^a-zA-Z]/g, "");
  return (letters.slice(0, len) || "XXX").toUpperCase();
}

// Fixed, system-wide Employee ID format — no longer configurable (there used
// to be a firm-level prefix/padding setting; that's gone):
//   {Company initials}-{First name initials}-{Last name initials}-{seq}
// e.g. "SHR-RAV-SHA-001" for "Shree Traders" / "Ravi Sharma". The trailing
// sequence is a running per-company (per businessClientId) employee count,
// independent of the name-derived initials, so two employees who happen to
// share initials still get distinct codes — mirrors the unique
// {businessClientId, employeeCode} index on ClientEmployee.
export async function generateNextEmployeeCode(
  companyName: string,
  employeeName: string,
  businessClientId: string | mongoose.Types.ObjectId
) {
  const nameParts = String(employeeName || "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;
  const companyFirstWord = String(companyName || "").trim().split(/\s+/)[0] || "";
  const prefix = `${initials(companyFirstWord)}-${initials(firstName)}-${initials(lastName)}`;

  const existing = await ClientEmployee.find({ businessClientId }).select("employeeCode").lean();
  let maxSeq = 0;
  for (const emp of existing) {
    const match = /-(\d+)$/.exec(emp.employeeCode || "");
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
    }
  }

  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
}

export function toNameKey(name: string) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}
