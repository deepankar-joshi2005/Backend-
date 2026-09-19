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

// One firm-wide format (prefix + zero-padded sequence, e.g. EMP-0001), but the
// sequence itself is counted independently per client — mirrors the existing
// unique {businessClientId, employeeCode} index on ClientEmployee.
export async function generateNextEmployeeCode(
  caFirmId: string | mongoose.Types.ObjectId,
  businessClientId: string | mongoose.Types.ObjectId
) {
  const firmSettings = await getOrCreateFirmPayrollSettings(caFirmId);
  const prefix = firmSettings.employeeIdPrefix || "EMP-";
  const padding = firmSettings.employeeIdPadding || 4;

  const existing = await ClientEmployee.find({
    businessClientId,
    employeeCode: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d+$` },
  })
    .select("employeeCode")
    .lean();

  let maxNumber = 0;
  for (const emp of existing) {
    const suffix = emp.employeeCode.slice(prefix.length);
    const num = parseInt(suffix, 10);
    if (!Number.isNaN(num) && num > maxNumber) maxNumber = num;
  }

  return `${prefix}${String(maxNumber + 1).padStart(padding, "0")}`;
}

export function toNameKey(name: string) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}
