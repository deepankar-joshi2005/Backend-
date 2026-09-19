import BusinessClient from "../models/BusinessClient";
import ClientPayrollSettings, {
  DEFAULT_EARNING_COMPONENTS,
  DEFAULT_DEDUCTION_COMPONENTS,
} from "../models/ClientPayrollSettings";
import ClientEmployee from "../models/ClientEmployee";
import ClientEmployeeSalaryStructure from "../models/ClientEmployeeSalaryStructure";
import ClientPayrollRun from "../models/ClientPayrollRun";
import ClientPayrollEntry from "../models/ClientPayrollEntry";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { writeAuditLog } from "../utils/writeAuditLog";
import { buildStructureTemplateRows, parseStructureWorkbook, sendWorkbook, ParsedStructureRow } from "../utils/clientPayrollExcel";
import { generateClientPayslipPDF } from "../utils/generateClientPayslipPDF";
import { generateNextEmployeeCode, getOrCreateFirmPayrollSettings, toNameKey } from "../utils/employeeIdGenerator";

function isValidMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month);
}

async function loadClient(req) {
  const client = await BusinessClient.findOne({ _id: req.params.businessClientId, caFirmId: req.user.caFirmId });
  if (!client) throw new ApiError(404, "Business client not found");
  return client;
}

async function getOrCreateSettings(businessClientId) {
  let settings = await ClientPayrollSettings.findOne({ businessClientId });
  if (!settings) {
    settings = await ClientPayrollSettings.create({
      businessClientId,
      earningComponents: DEFAULT_EARNING_COMPONENTS,
      deductionComponents: DEFAULT_DEDUCTION_COMPONENTS,
    });
  }
  return settings;
}

// Recomputes every non-Basic earning/deduction component as % of Basic Salary
// for a single structure doc, in place (does not save). Components with no
// configured percentage are left untouched (0, or whatever was there before).
function applyPercentagesToStructure(structure, settings) {
  const basic = Number(structure.earnings?.get?.("Basic Salary") ?? structure.earnings?.["Basic Salary"] ?? 0);
  const percentages = settings.componentPercentages || new Map();
  const getPct = (name: string) => (percentages instanceof Map ? percentages.get(name) : percentages[name]);

  const earnings: Record<string, number> = { "Basic Salary": basic };
  for (const c of settings.earningComponents) {
    if (c === "Basic Salary") continue;
    const pct = getPct(c);
    if (pct !== undefined && pct !== null) earnings[c] = Math.round(basic * (Number(pct) / 100));
  }
  const deductions: Record<string, number> = {};
  for (const c of settings.deductionComponents) {
    const pct = getPct(c);
    if (pct !== undefined && pct !== null) deductions[c] = Math.round(basic * (Number(pct) / 100));
  }

  structure.earnings = earnings;
  structure.deductions = deductions;
  structure.gross = Object.values(earnings).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

async function getOrCreateRun(businessClientId, month) {
  let run = await ClientPayrollRun.findOne({ businessClientId, month });
  if (!run) {
    run = await ClientPayrollRun.create({ businessClientId, month, status: "Draft" });
  }
  return run;
}

// ── Firm-wide payroll settings (Employee ID format + rolling default %) ────

export const getFirmSettings = catchAsync(async (req, res) => {
  const settings = await getOrCreateFirmPayrollSettings(req.user.caFirmId);
  res.json({ success: true, data: settings });
});

export const updateFirmSettings = catchAsync(async (req, res) => {
  const { employeeIdPrefix, employeeIdPadding } = req.body;
  const settings = await getOrCreateFirmPayrollSettings(req.user.caFirmId);
  if (employeeIdPrefix !== undefined) settings.employeeIdPrefix = employeeIdPrefix || "EMP-";
  if (employeeIdPadding !== undefined) settings.employeeIdPadding = Number(employeeIdPadding) || 4;
  await settings.save();
  res.json({ success: true, data: settings, message: "Employee ID format updated" });
});

// ── Salary components list (which columns exist — separate from %) ─────────

export const getSettings = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const settings = await getOrCreateSettings(client._id);
  res.json({ success: true, data: settings });
});

export const updateSettings = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const { earningComponents, deductionComponents } = req.body;
  if (!Array.isArray(earningComponents) || earningComponents.length === 0) {
    throw new ApiError(400, "At least one earning component is required");
  }
  const settings = await getOrCreateSettings(client._id);
  settings.earningComponents = earningComponents;
  settings.deductionComponents = Array.isArray(deductionComponents) ? deductionComponents : [];
  await settings.save();
  res.json({ success: true, data: settings, message: "Payroll components updated" });
});

// ── Structure Settings: % of Basic Salary per component ─────────────────────

export const updateComponentPercentages = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const { percentages, month } = req.body;
  if (!percentages || typeof percentages !== "object") throw new ApiError(400, "Percentages are required");

  const settings = await getOrCreateSettings(client._id);
  const requiredComponents = [...settings.earningComponents.filter((c) => c !== "Basic Salary"), ...settings.deductionComponents];
  const missing = requiredComponents.filter((c) => percentages[c] === undefined || percentages[c] === null || percentages[c] === "");
  if (missing.length > 0) {
    throw new ApiError(400, `Set a percentage for: ${missing.join(", ")}`);
  }

  const percentMap = new Map<string, number>();
  for (const c of requiredComponents) percentMap.set(c, Number(percentages[c]) || 0);
  settings.componentPercentages = percentMap;
  await settings.save();

  // Rolling firm-wide default — the next client to open Structure Settings
  // starts pre-filled with whatever was last saved anywhere in this firm.
  const firmSettings = await getOrCreateFirmPayrollSettings(req.user.caFirmId);
  firmSettings.defaultComponentPercentages = percentMap;
  await firmSettings.save();

  let recomputed = 0;
  if (month && isValidMonth(month)) {
    const structures = await ClientEmployeeSalaryStructure.find({ businessClientId: client._id, month });
    for (const structure of structures) {
      applyPercentagesToStructure(structure, settings);
      await structure.save();
    }
    recomputed = structures.length;
  }

  res.json({ success: true, data: settings, message: `Percentages saved${recomputed ? ` — ${recomputed} employee(s) recalculated` : ""}` });
});

// ── Template download (always the same 4 static columns) ───────────────────

export const downloadTemplate = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const rows = buildStructureTemplateRows();
  sendWorkbook(res, rows, "Salary Structure Template", `${client.name.replace(/[^a-z0-9]/gi, "_")}_Salary_Structure_Template.xlsx`);
});

// ── Salary Structure: per-month employee list ───────────────────────────────

export const getStructureForMonth = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  if (!isValidMonth(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");

  const [settings, structures, run] = await Promise.all([
    getOrCreateSettings(client._id),
    ClientEmployeeSalaryStructure.find({ businessClientId: client._id, month }).sort({ createdAt: 1 }).lean(),
    ClientPayrollRun.findOne({ businessClientId: client._id, month }).lean(),
  ]);

  const employeeIds = structures.map((s) => s.clientEmployeeId);
  const employees = await ClientEmployee.find({ _id: { $in: employeeIds } }).lean();
  const employeeById = new Map(employees.map((e) => [String(e._id), e]));

  const data = structures.map((s) => ({
    ...s,
    employee: employeeById.get(String(s.clientEmployeeId)) || null,
  }));

  res.json({ success: true, data, settings, run: run || null });
});

// ── Upload: preview then confirm ────────────────────────────────────────

export const previewStructureUpload = catchAsync(async (req, res) => {
  await loadClient(req);
  if (!isValidMonth(req.params.month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");
  if (!req.file) throw new ApiError(400, "No file uploaded");

  const { rows, errors } = parseStructureWorkbook(req.file.buffer);
  res.json({ success: true, data: rows, errors, fileName: req.file.originalname });
});

export const confirmStructureUpload = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  if (!isValidMonth(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");

  const rows: ParsedStructureRow[] = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) throw new ApiError(400, "No rows to import");

  const settings = await getOrCreateSettings(client._id);
  const hasPercentages = settings.componentPercentages && settings.componentPercentages.size > 0;
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const row of rows) {
    try {
      const nameKey = toNameKey(row.employeeName);
      let employee = await ClientEmployee.findOne({ businessClientId: client._id, nameKey });
      if (!employee) {
        const employeeCode = await generateNextEmployeeCode(req.user.caFirmId, client._id);
        employee = await ClientEmployee.create({
          businessClientId: client._id,
          employeeCode,
          name: row.employeeName,
          nameKey,
        });
      }

      let structure = await ClientEmployeeSalaryStructure.findOne({ clientEmployeeId: employee._id, month });
      if (!structure) {
        structure = new ClientEmployeeSalaryStructure({
          businessClientId: client._id,
          clientEmployeeId: employee._id,
          month,
          earnings: {},
          deductions: {},
        });
      }
      structure.payDays = row.payDays;
      structure.totalWorkingDays = row.totalWorkingDays;
      const earnings: Record<string, number> =
        structure.earnings instanceof Map ? Object.fromEntries(structure.earnings) : { ...((structure.earnings as any) || {}) };
      earnings["Basic Salary"] = row.basicSalary;
      structure.earnings = earnings as any;

      if (hasPercentages) {
        applyPercentagesToStructure(structure, settings);
      } else {
        // earnings is the plain object assigned above — read from it directly
        // rather than structure.earnings, which Mongoose has already cast to a Map.
        structure.gross = Object.values(earnings).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
      }
      await structure.save();
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push(`Row ${row.row}: ${err.message}`);
    }
  }

  const run = await getOrCreateRun(client._id, month);
  run.employeeCount = await ClientEmployeeSalaryStructure.countDocuments({ businessClientId: client._id, month });
  run.sourceFileName = req.body.sourceFileName;
  run.uploadedBy = req.user.id;
  run.uploadedAt = new Date();
  // New attendance/salary data invalidates any previously generated numbers —
  // the CA must review and explicitly re-save before Generate is allowed again.
  run.structureSaved = false;
  run.structureSavedAt = undefined;
  if (run.status !== "Draft") run.status = "Draft";
  await run.save();

  res.json({ success: true, message: "Upload processed", results, runId: run._id });
});

// ── Cost Center: one value applied across every employee row for the month ─

export const updateCostCenter = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  if (!isValidMonth(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");
  const { costCenter } = req.body;

  await ClientEmployeeSalaryStructure.updateMany({ businessClientId: client._id, month }, { $set: { costCenter: costCenter || "" } });
  res.json({ success: true, message: "Cost center applied to all employees" });
});

// ── Manual edit of one employee's structure for a month ─────────────────────

export const updateEmployeeStructure = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  if (!isValidMonth(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");
  const employee = await ClientEmployee.findOne({ _id: req.params.employeeId, businessClientId: client._id });
  if (!employee) throw new ApiError(404, "Employee not found");

  const { earnings = {}, deductions = {}, payDays, totalWorkingDays, costCenter } = req.body;
  const gross = Object.values(earnings).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);

  const existing = await ClientEmployeeSalaryStructure.findOne({ clientEmployeeId: employee._id, month });
  const effectivePayDays = payDays !== undefined ? Number(payDays) : existing?.payDays || 0;
  const effectiveTotalWorkingDays = totalWorkingDays !== undefined ? Number(totalWorkingDays) : existing?.totalWorkingDays || 0;
  if (effectiveTotalWorkingDays > 0 && effectivePayDays > effectiveTotalWorkingDays) {
    throw new ApiError(400, `Pay Days (${effectivePayDays}) cannot exceed Total Working Days (${effectiveTotalWorkingDays})`);
  }

  const structure = await ClientEmployeeSalaryStructure.findOneAndUpdate(
    { clientEmployeeId: employee._id, month },
    {
      businessClientId: client._id,
      clientEmployeeId: employee._id,
      month,
      earnings,
      deductions,
      gross,
      ...(payDays !== undefined ? { payDays } : {}),
      ...(totalWorkingDays !== undefined ? { totalWorkingDays } : {}),
      ...(costCenter !== undefined ? { costCenter } : {}),
    },
    { new: true, upsert: true }
  );

  res.json({ success: true, data: structure, message: "Salary structure updated" });
});

// ── Save structure for the month (unlocks Generate/Run/View downstream) ────

export const saveStructureForMonth = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  if (!isValidMonth(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");

  const count = await ClientEmployeeSalaryStructure.countDocuments({ businessClientId: client._id, month });
  if (count === 0) throw new ApiError(400, "Import this month's Excel before saving the salary structure");

  const run = await getOrCreateRun(client._id, month);
  run.structureSaved = true;
  run.structureSavedAt = new Date();
  run.employeeCount = count;
  await run.save();

  await writeAuditLog(req, {
    action: "client_payroll.structure_saved",
    targetType: "BusinessClient",
    targetId: client._id,
    targetLabel: `${client.name} — ${month}`,
  });

  res.json({ success: true, data: run, message: "Salary structure saved" });
});

// ── Generate / Run ───────────────────────────────────────────────────────

export const generatePayroll = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  const run = await ClientPayrollRun.findOne({ businessClientId: client._id, month });
  if (!run) throw new ApiError(404, "No salary structure found for this month — set it up on the Salary Structure page first");
  if (!run.structureSaved) throw new ApiError(400, "Complete and save this month's Salary Structure before generating payroll");

  const structures = await ClientEmployeeSalaryStructure.find({ businessClientId: client._id, month });
  if (structures.length === 0) throw new ApiError(400, "No employees in this month's salary structure");

  let totalGross = 0,
    totalDeduction = 0,
    totalNet = 0;

  for (const structure of structures) {
    const fullGross = structure.gross || 0;
    const totalWorkingDays = structure.totalWorkingDays || 0;
    const payDays = structure.payDays || 0;
    const perDayRate = totalWorkingDays > 0 ? fullGross / totalWorkingDays : 0;
    const prorationFactor = totalWorkingDays > 0 ? payDays / totalWorkingDays : 0;

    // Prorate every earning component (not just the top-line total) so the
    // per-component breakdown shown on the run detail page and printed on
    // the payslip PDF always sums exactly to Gross Pay — previously the
    // components were stored at their full, un-prorated monthly value while
    // Gross Pay itself was prorated, so the two never matched whenever an
    // employee had any LOP days.
    const earningsSource: Map<string, number> = structure.earnings as any;
    const proratedEarnings: Record<string, number> = {};
    for (const [component, value] of earningsSource.entries()) {
      proratedEarnings[component] = Math.round((Number(value) || 0) * prorationFactor);
    }
    const earnedGross = Object.values(proratedEarnings).reduce((sum, v) => sum + v, 0);

    const deductionSum = Array.from((structure.deductions as Map<string, number>).values()).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0
    );
    const net = Math.max(0, earnedGross - deductionSum);

    await ClientPayrollEntry.findOneAndUpdate(
      { payrollRunId: run._id, clientEmployeeId: structure.clientEmployeeId },
      {
        payrollRunId: run._id,
        clientEmployeeId: structure.clientEmployeeId,
        costCenter: structure.costCenter || "",
        payDays,
        lopDays: Math.max(0, totalWorkingDays - payDays),
        earnings: proratedEarnings,
        deductions: structure.deductions,
        gross: earnedGross,
        totalDeduction: deductionSum,
        perDayRate: Math.round(perDayRate * 100) / 100,
        net,
      },
      { new: true, upsert: true }
    );

    totalGross += earnedGross;
    totalDeduction += deductionSum;
    totalNet += net;
  }

  run.status = "Generated";
  run.generatedAt = new Date();
  run.employeeCount = structures.length;
  run.totalGross = totalGross;
  run.totalDeduction = totalDeduction;
  run.totalNet = totalNet;
  await run.save();

  res.json({ success: true, data: run, message: "Payroll generated" });
});

export const runPayroll = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  const run = await ClientPayrollRun.findOne({ businessClientId: client._id, month });
  if (!run) throw new ApiError(404, "Payroll run not found");
  if (run.status !== "Generated") throw new ApiError(400, "Generate payroll before running it");

  run.status = "Completed";
  run.runBy = req.user.id;
  run.runAt = new Date();
  await run.save();

  await writeAuditLog(req, {
    action: "client_payroll.run",
    targetType: "BusinessClient",
    targetId: client._id,
    targetLabel: `${client.name} — ${month}`,
  });

  res.json({ success: true, data: run, message: "Payroll run" });
});

// ── Listing / detail / export ───────────────────────────────────────────

export const listRuns = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const runs = await ClientPayrollRun.find({ businessClientId: client._id }).sort({ month: -1 });
  res.json({ success: true, data: runs });
});

export const getRunDetail = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const run = await ClientPayrollRun.findOne({ businessClientId: client._id, month: req.params.month })
    .populate("uploadedBy", "name")
    .populate("runBy", "name");
  if (!run) throw new ApiError(404, "Payroll run not found");

  const entries = await ClientPayrollEntry.find({ payrollRunId: run._id }).lean();
  const employeeIds = entries.map((e) => e.clientEmployeeId);
  const employees = await ClientEmployee.find({ _id: { $in: employeeIds } }).lean();
  const employeeById = new Map(employees.map((e) => [String(e._id), e]));

  const data = entries.map((e) => ({
    ...e,
    employee: employeeById.get(String(e.clientEmployeeId)) || null,
  }));

  res.json({ success: true, data: { run, entries: data } });
});

export const exportRun = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const settings = await getOrCreateSettings(client._id);
  const run = await ClientPayrollRun.findOne({ businessClientId: client._id, month: req.params.month });
  if (!run) throw new ApiError(404, "Payroll run not found");

  const entries = await ClientPayrollEntry.find({ payrollRunId: run._id }).lean();
  const employeeIds = entries.map((e) => e.clientEmployeeId);
  const employees = await ClientEmployee.find({ _id: { $in: employeeIds } }).lean();
  const employeeById = new Map(employees.map((e) => [String(e._id), e]));

  const rows = entries.map((e) => {
    const employee = employeeById.get(String(e.clientEmployeeId));
    // .lean() returns Map schema fields as plain objects already.
    const earnings = e.earnings || {};
    const deductions = e.deductions || {};
    const row: Record<string, any> = {
      "Employee Code": employee?.employeeCode || "",
      "Full Name": employee?.name || "",
      "Cost Center": e.costCenter || "",
      "Pay Days": e.payDays,
      "LOP Days": e.lopDays,
    };
    settings.earningComponents.forEach((c) => (row[c] = earnings[c] ?? 0));
    row["Gross Pay"] = e.gross;
    settings.deductionComponents.forEach((c) => (row[c] = deductions[c] ?? 0));
    row["Total Deductions"] = e.totalDeduction;
    row["Net Pay"] = e.net;
    return row;
  });

  sendWorkbook(res, rows, req.params.month, `${client.name.replace(/[^a-z0-9]/gi, "_")}_Payroll_${req.params.month}.xlsx`);
});

// Only available once payroll is actually run — before that, deductions/net
// aren't final and an official-looking payslip would be misleading.
export const downloadPayslip = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  const run = await ClientPayrollRun.findOne({ businessClientId: client._id, month });
  if (!run) throw new ApiError(404, "Payroll run not found");
  if (run.status !== "Completed") throw new ApiError(400, "Payslips are available once this month's payroll has been run");

  const entry = await ClientPayrollEntry.findOne({ payrollRunId: run._id, clientEmployeeId: req.params.employeeId }).lean();
  if (!entry) throw new ApiError(404, "Employee not found in this payroll run");

  const employee = await ClientEmployee.findById(req.params.employeeId).lean();
  if (!employee) throw new ApiError(404, "Employee not found");

  const clientAddress = [client.address, client.city, client.state, client.pincode].filter(Boolean).join(", ");

  const pdf = await generateClientPayslipPDF({
    clientName: client.name,
    clientAddress,
    clientEmail: client.email,
    clientPhone: client.phone,
    employeeName: employee.name,
    employeeCode: employee.employeeCode,
    costCenter: entry.costCenter,
    month,
    payDays: entry.payDays,
    lopDays: entry.lopDays,
    earnings: entry.earnings || {},
    deductions: entry.deductions || {},
    gross: entry.gross,
    totalDeduction: entry.totalDeduction,
    net: entry.net,
  });

  res.header("Content-Type", "application/pdf");
  res.attachment(`${employee.name.replace(/[^a-z0-9]/gi, "_")}_${month}_Payslip.pdf`);
  res.send(pdf);
});
