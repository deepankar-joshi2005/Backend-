import BusinessClient from "../models/BusinessClient";
import ClientPayrollSettings, {
  DEFAULT_EARNING_COMPONENTS,
  DEFAULT_DEDUCTION_COMPONENTS,
  DEFAULT_TEMPLATE_COLUMNS,
  TEMPLATE_COLUMN_ROLES,
  TEMPLATE_COLUMN_DATA_TYPES,
  PERCENT_ONLY_COMPONENTS,
  NON_CONFIGURABLE_COMPONENTS,
  STATUTORY_WAGE_BASE_COMPONENTS,
  STATUTORY_EXCLUDED_COMPONENTS,
  PF_WAGE_CEILING,
  PF_RATE,
  ESI_WAGE_CEILING,
  ESI_RATE,
  EMPLOYER_PF_RATE,
  EMPLOYER_ESI_RATE,
} from "../models/ClientPayrollSettings";
import ClientEmployee from "../models/ClientEmployee";
import ClientEmployeeSalaryStructure from "../models/ClientEmployeeSalaryStructure";
import ClientPayrollRun from "../models/ClientPayrollRun";
import ClientPayrollEntry from "../models/ClientPayrollEntry";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { writeAuditLog } from "../utils/writeAuditLog";
import { buildStructureTemplateRows, parseStructureWorkbook, sendWorkbook, ParsedStructureRow, TemplateColumn } from "../utils/clientPayrollExcel";
import { generateClientPayslipPDF } from "../utils/generateClientPayslipPDF";
import { generateNextEmployeeCode, getOrCreateFirmPayrollSettings, toNameKey } from "../utils/employeeIdGenerator";

function isValidMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month);
}

function slugify(label: string) {
  return (
    String(label || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "column"
  );
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
      templateColumns: DEFAULT_TEMPLATE_COLUMNS,
    });
  } else if (!settings.templateColumns || settings.templateColumns.length === 0) {
    // Backfill for settings docs created before Template Settings existed —
    // identical to today's fixed 4-column behavior until the CA changes it.
    settings.templateColumns = DEFAULT_TEMPLATE_COLUMNS as any;
    await settings.save();
  }
  return settings;
}

// Calculation, in place on a single structure doc (does not save):
//   1. Basic is configured via Structure Setting like any other component —
//      "percent" (of CTC — it's the one component whose % is of CTC, not of
//      Basic, since it can't be a % of itself) or "fixed". It's the anchor
//      everything else derives from.
//   2. Every other earning component is either:
//      - "percent" (default): % of Basic, or
//      - "fixed": the same flat rupee amount for every employee (e.g.
//        Arrears set to 1000 means every employee's Arrears is ₹1000).
//   3. Gross = sum of all earnings.
//   4. Employee PF and Employee ESI are statutory formulas, fixed and
//      identical for every client/employee — never a %/fixed value, see
//      NON_CONFIGURABLE_COMPONENTS and the constants imported above:
//        Add-back = max(0, sum(STATUTORY_EXCLUDED_COMPONENTS) − 50% of Gross)
//        Statutory Wages = Basic + DA + Retaining Allowance + Add-back
//        PF Wages = min(Statutory Wages, PF_WAGE_CEILING); Employee PF = PF Wages × PF_RATE
//        ESI Wages = Statutory Wages ≤ ESI_WAGE_CEILING ? Statutory Wages : 0; Employee ESI = ESI Wages × ESI_RATE
//   5. Every other deduction component follows the same percent/fixed rule as (2).
//      PERCENT_ONLY_COMPONENTS (NPS) ignores mode and is always "percent" —
//      enforced again here, not just trusted from settings.
// A component's mode/%/fixed comes from the client-wide setting UNLESS this
// employee has their own override for it (structure.componentModeOverrides
// etc, set via "Edit salary structure" — see updateEmployeeComponentSettings)
// — that lets one employee's Basic/DA/HRA/etc. differ without touching anyone
// else, and without freezing them out of future client-wide changes on
// components they never overrode. Components with no configured value for
// their mode are left untouched (0, or whatever was there before).
function applyPercentagesToStructure(structure, settings) {
  const ctc = Number(structure.ctc) || 0;
  const percentages = settings.componentPercentages || new Map();
  const fixedAmounts = settings.componentFixedAmounts || new Map();
  const modes = settings.componentModes || new Map();
  const modeOverrides = structure.componentModeOverrides || new Map();
  const pctOverrides = structure.componentPercentageOverrides || new Map();
  const fixedOverrides = structure.componentFixedAmountOverrides || new Map();
  const getFromMap = (map: any, name: string) => (map instanceof Map ? map.get(name) : map[name]);

  const getPct = (name: string) => {
    const override = getFromMap(pctOverrides, name);
    return override !== undefined && override !== null ? override : getFromMap(percentages, name);
  };
  const getFixed = (name: string) => {
    const override = getFromMap(fixedOverrides, name);
    return override !== undefined && override !== null ? override : getFromMap(fixedAmounts, name);
  };
  const getMode = (name: string) => {
    if (PERCENT_ONLY_COMPONENTS.includes(name)) return "percent";
    const override = getFromMap(modeOverrides, name);
    if (override === "fixed" || override === "percent") return override;
    const m = getFromMap(modes, name);
    return m === "fixed" ? "fixed" : "percent";
  };

  function basicValue(): number {
    if (getMode("Basic") === "fixed") {
      const fixed = getFixed("Basic");
      return fixed !== undefined && fixed !== null ? Number(fixed) || 0 : 0;
    }
    const pct = getPct("Basic");
    return pct !== undefined && pct !== null ? Math.round(ctc * (Number(pct) / 100)) : 0;
  }
  const basic = basicValue();

  function componentValue(c: string): number | undefined {
    if (getMode(c) === "fixed") {
      const fixed = getFixed(c);
      return fixed !== undefined && fixed !== null ? Number(fixed) || 0 : undefined;
    }
    const pct = getPct(c);
    return pct !== undefined && pct !== null ? Math.round(basic * (Number(pct) / 100)) : undefined;
  }

  const earnings: Record<string, number> = { Basic: basic };
  for (const c of settings.earningComponents) {
    if (c === "Basic") continue;
    const value = componentValue(c);
    if (value !== undefined) earnings[c] = value;
  }
  const gross = Object.values(earnings).reduce((sum, v) => sum + (Number(v) || 0), 0);

  const excludedSum = STATUTORY_EXCLUDED_COMPONENTS.reduce((sum, c) => sum + (Number(earnings[c]) || 0), 0);
  const addBack = Math.max(0, Math.round(excludedSum - 0.5 * gross));
  const statutoryWages =
    STATUTORY_WAGE_BASE_COMPONENTS.reduce((sum, c) => sum + (Number(earnings[c]) || 0), 0) + addBack;
  const pfWages = Math.min(statutoryWages, PF_WAGE_CEILING);
  const employeePf = Math.round(pfWages * PF_RATE);
  const esiWages = statutoryWages <= ESI_WAGE_CEILING ? statutoryWages : 0;
  const employeeEsi = Math.round(esiWages * ESI_RATE);
  // Employer-side contributions — same wage bases, employer's own cost, never
  // deducted from the employee (not part of earnings/deductions/Gross/Net).
  const employerPf = Math.round(pfWages * EMPLOYER_PF_RATE);
  const employerEsi = Math.round(esiWages * EMPLOYER_ESI_RATE);

  const deductions: Record<string, number> = {};
  for (const c of settings.deductionComponents) {
    if (c === "Employee PF") {
      deductions[c] = employeePf;
      continue;
    }
    if (c === "Employee ESI") {
      deductions[c] = employeeEsi;
      continue;
    }
    const value = componentValue(c);
    if (value !== undefined) deductions[c] = value;
  }

  structure.earnings = earnings;
  structure.deductions = deductions;
  structure.gross = gross;
  structure.employerPf = employerPf;
  structure.employerEsi = employerEsi;
  // Sanity check only — never adjusts ctc itself. A mismatch means this
  // employee's Structure Setting %/fixed split adds up to more than the CTC
  // that was uploaded (Gross + Employer PF + Employer ESI must not exceed
  // CTC — it's fine for it to land under); saveStructureForMonth blocks on
  // this.
  structure.ctcMismatch = Math.round(gross + employerPf + employerEsi) > Math.round(ctc);
}

// Resolves a blank CTC cell by carrying forward the employee's most recent
// prior month's CTC. Used by both previewStructureUpload (so the CA sees the
// carried-forward value before confirming) and confirmStructureUpload (as a
// defensive fallback in case a row somehow arrives unresolved).
async function resolveCtc(businessClientId, month: string, employeeName: string): Promise<{ ctc?: number; carriedForward?: boolean; reason?: string }> {
  const nameKey = toNameKey(employeeName);
  const employee = await ClientEmployee.findOne({ businessClientId, nameKey });
  if (!employee) return { reason: `${employeeName}: CTC is required for a new employee` };

  const previous = await ClientEmployeeSalaryStructure.findOne({ clientEmployeeId: employee._id, month: { $lt: month } }).sort({ month: -1 });
  if (previous && previous.ctc > 0) return { ctc: previous.ctc, carriedForward: true };
  return { reason: `${employeeName}: no previous CTC on record — please provide CTC this month` };
}

async function getOrCreateRun(businessClientId, month) {
  let run = await ClientPayrollRun.findOne({ businessClientId, month });
  if (!run) {
    run = await ClientPayrollRun.create({ businessClientId, month, status: "Draft" });
  }
  return run;
}

// ── Firm-wide payroll settings (rolling default % + column display order) ──

export const getFirmSettings = catchAsync(async (req, res) => {
  const settings = await getOrCreateFirmPayrollSettings(req.user.caFirmId);
  res.json({ success: true, data: settings });
});

export const updateFirmSettings = catchAsync(async (req, res) => {
  const { columnOrder } = req.body;
  const settings = await getOrCreateFirmPayrollSettings(req.user.caFirmId);
  if (Array.isArray(columnOrder)) settings.columnOrder = columnOrder;
  await settings.save();
  res.json({ success: true, data: settings, message: "Column order updated" });
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

// ── Structure Settings: Basic is % of CTC (or a flat fixed amount); every
// other component is either % of Basic or a flat fixed amount ─────────────

export const updateComponentPercentages = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const { percentages, modes, fixedAmounts, month } = req.body;
  if (!percentages || typeof percentages !== "object") throw new ApiError(400, "Percentages are required");

  const settings = await getOrCreateSettings(client._id);
  // Employee PF/ESI are fixed statutory formulas, never a configured
  // %/fixed value — see applyPercentagesToStructure. Basic IS configured
  // here like any other component (its % is of CTC, not of itself).
  const requiredComponents = [...settings.earningComponents, ...settings.deductionComponents].filter(
    (c) => !NON_CONFIGURABLE_COMPONENTS.includes(c)
  );

  const modeMap = new Map<string, string>();
  const percentMap = new Map<string, number>();
  const fixedMap = new Map<string, number>();
  const missing: string[] = [];

  for (const c of requiredComponents) {
    // The statutory PERCENT_ONLY_COMPONENTS always stay "percent", regardless
    // of what the client sent — same enforcement as applyPercentagesToStructure.
    const locked = PERCENT_ONLY_COMPONENTS.includes(c);
    const mode = !locked && modes?.[c] === "fixed" ? "fixed" : "percent";
    modeMap.set(c, mode);

    if (mode === "fixed") {
      const val = fixedAmounts?.[c];
      if (val === undefined || val === null || val === "") {
        missing.push(c);
        continue;
      }
      fixedMap.set(c, Number(val) || 0);
    } else {
      const val = percentages[c];
      if (val === undefined || val === null || val === "") {
        missing.push(c);
        continue;
      }
      percentMap.set(c, Number(val) || 0);
    }
  }
  if (missing.length > 0) {
    throw new ApiError(400, `Set a value for: ${missing.join(", ")}`);
  }

  settings.componentPercentages = percentMap;
  settings.componentFixedAmounts = fixedMap;
  settings.componentModes = modeMap;
  await settings.save();

  // Rolling firm-wide default — the next client to open Structure Settings
  // starts pre-filled with whatever was last saved anywhere in this firm.
  const firmSettings = await getOrCreateFirmPayrollSettings(req.user.caFirmId);
  firmSettings.defaultComponentPercentages = percentMap;
  firmSettings.defaultComponentFixedAmounts = fixedMap;
  firmSettings.defaultComponentModes = modeMap;
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

  res.json({ success: true, data: settings, message: `Structure Setting saved${recomputed ? ` — ${recomputed} employee(s) recalculated` : ""}` });
});

// ── Template Settings: which columns appear on the downloadable/uploadable
// monthly Excel, and in what order ─────────────────────────────────────────

export const updateTemplateColumns = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const { columns } = req.body;
  if (!Array.isArray(columns) || columns.length === 0) throw new ApiError(400, "At least one column is required");

  const employeeNameColumns = columns.filter((c) => c.role === "employeeName");
  if (employeeNameColumns.length !== 1) {
    throw new ApiError(400, "Exactly one Employee Name column is required — it's how upload rows are matched to employees");
  }

  const settings = await getOrCreateSettings(client._id);
  const existingByKey = new Map<string, any>((settings.templateColumns || []).map((c: any): [string, any] => [c.key, c]));
  const usedKeys = new Set<string>();

  const nextColumns: TemplateColumn[] = columns.map((col, index) => {
    const role = TEMPLATE_COLUMN_ROLES.includes(col.role) ? col.role : "custom";
    const label = String(col.label || "").trim();
    if (!label) throw new ApiError(400, "Every column needs a label");

    let key = col.key && existingByKey.has(col.key) ? col.key : undefined;
    if (!key) {
      // New column (no key, or a key we don't recognize) — mint a stable,
      // unique-within-this-client slug from its label.
      const base = slugify(label);
      let candidate = base;
      let n = 1;
      while (usedKeys.has(candidate) || (existingByKey.has(candidate) && !columns.some((c) => c.key === candidate))) {
        candidate = `${base}_${++n}`;
      }
      key = candidate;
    }
    usedKeys.add(key);

    const dataType =
      role === "custom" && TEMPLATE_COLUMN_DATA_TYPES.includes(col.dataType)
        ? col.dataType
        : role === "employeeName"
          ? "text"
          : "number";

    return { key, label, role, dataType, order: index + 1 };
  });

  settings.templateColumns = nextColumns as any;
  await settings.save();

  res.json({ success: true, data: settings, message: "Template columns updated" });
});

// ── Template download (columns driven by Template Settings) ────────────────

export const downloadTemplate = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const settings = await getOrCreateSettings(client._id);
  const rows = buildStructureTemplateRows(settings.templateColumns as any);
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
  const client = await loadClient(req);
  const month = req.params.month;
  if (!isValidMonth(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");
  if (!req.file) throw new ApiError(400, "No file uploaded");

  const settings = await getOrCreateSettings(client._id);
  const { rows, errors } = parseStructureWorkbook(req.file.buffer, settings.templateColumns as any);

  // A blank CTC cell (when a CTC column is configured at all) isn't an error
  // from the parser — resolve it here by carrying forward the employee's most
  // recent CTC, so the CA sees the actual value that will be saved.
  const hasCtcColumn = (settings.templateColumns as any[]).some((c) => c.role === "ctc");
  const resolvedRows: any[] = [];
  for (const row of rows) {
    if (hasCtcColumn && row.ctc === undefined) {
      const resolved = await resolveCtc(client._id, month, row.employeeName);
      if (resolved.ctc !== undefined) {
        resolvedRows.push({ ...row, ctc: resolved.ctc, ctcCarriedForward: true });
      } else {
        errors.push(`Row ${row.row}: ${resolved.reason}`);
      }
    } else {
      resolvedRows.push(row);
    }
  }

  res.json({ success: true, data: resolvedRows, errors, fileName: req.file.originalname });
});

export const confirmStructureUpload = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  if (!isValidMonth(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");

  const rows: ParsedStructureRow[] = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) throw new ApiError(400, "No rows to import");

  const settings = await getOrCreateSettings(client._id);
  const hasPercentages = settings.componentPercentages && settings.componentPercentages.size > 0;
  const hasCtcColumn = (settings.templateColumns as any[]).some((c: any) => c.role === "ctc");
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const row of rows) {
    try {
      const nameKey = toNameKey(row.employeeName);
      let employee = await ClientEmployee.findOne({ businessClientId: client._id, nameKey });
      if (!employee) {
        const employeeCode = await generateNextEmployeeCode(client.name, row.employeeName, client._id);
        employee = await ClientEmployee.create({
          businessClientId: client._id,
          employeeCode,
          name: row.employeeName,
          nameKey,
          source: "excel_import",
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
      // payDays/totalWorkingDays/ctc are only present on the parsed row when
      // that column is still configured in Template Settings — a client
      // that's removed one keeps whatever was already stored (or 0 for a
      // brand-new structure) rather than being force-reset here.
      if (row.payDays !== undefined) structure.payDays = row.payDays;
      if (row.totalWorkingDays !== undefined) structure.totalWorkingDays = row.totalWorkingDays;
      if (row.ctc !== undefined) {
        structure.ctc = row.ctc;
      } else if (hasCtcColumn && !structure.ctc) {
        // Defensive fallback — previewStructureUpload should already have
        // resolved this, but resolve it again here in case confirm is ever
        // reached with an unresolved row.
        const resolved = await resolveCtc(client._id, month, row.employeeName);
        if (resolved.ctc === undefined) throw new Error(resolved.reason);
        structure.ctc = resolved.ctc;
      }
      structure.customFields = row.customFields as any;

      if (hasPercentages) {
        applyPercentagesToStructure(structure, settings);
      } else {
        // No percentages configured yet — there's nothing to derive Basic
        // Salary/HRA/etc. from, so there's honestly nothing to pay out yet.
        structure.earnings = {} as any;
        structure.deductions = {} as any;
        structure.gross = 0;
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

  // earnings/deductions are optional here — omit them (as the "Edit salary
  // structure" modal now does) to leave the last computed values untouched;
  // updateEmployeeComponentSettings below is what recomputes them off
  // Basic Salary. Passing them explicitly still works as a raw manual override.
  const { ctc, earnings, deductions, payDays, totalWorkingDays, costCenter, customFields } = req.body;

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
      ...(earnings !== undefined
        ? { earnings, gross: Object.values(earnings).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0) }
        : {}),
      ...(deductions !== undefined ? { deductions } : {}),
      ...(ctc !== undefined ? { ctc: Number(ctc) || 0 } : {}),
      ...(payDays !== undefined ? { payDays } : {}),
      ...(totalWorkingDays !== undefined ? { totalWorkingDays } : {}),
      ...(costCenter !== undefined ? { costCenter } : {}),
      ...(customFields !== undefined ? { customFields } : {}),
    },
    { new: true, upsert: true }
  );

  res.json({ success: true, data: structure, message: "Salary structure updated" });
});

// Bulk-removes imported rows for a month (e.g. rows imported by mistake) —
// only touches this month's ClientEmployeeSalaryStructure rows, never the
// underlying ClientEmployee record. Blocked once the structure is saved for
// the month (payroll may already be generated off it) — re-import instead,
// which correctly resets structureSaved and lets edits happen before the
// next save.
export const deleteStructureRows = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  if (!isValidMonth(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");
  const { employeeIds } = req.body;
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new ApiError(400, "Select at least one employee to remove");
  }

  const run = await getOrCreateRun(client._id, month);
  if (run.structureSaved) {
    throw new ApiError(400, "This month's salary structure is already saved — rows can no longer be removed");
  }

  const result = await ClientEmployeeSalaryStructure.deleteMany({
    businessClientId: client._id,
    month,
    clientEmployeeId: { $in: employeeIds },
  });

  run.employeeCount = await ClientEmployeeSalaryStructure.countDocuments({ businessClientId: client._id, month });
  await run.save();

  res.json({ success: true, message: `Removed ${result.deletedCount} row(s)`, deletedCount: result.deletedCount });
});

// ── Per-employee Structure Setting overrides — lets one employee's DA/HRA/etc
// differ from the client-wide Structure Setting without touching anyone else.
// Wholesale-replaces this employee's override maps with whatever's sent (only
// components the CA explicitly marked "custom for this employee" should be
// included — anything omitted falls back to, and keeps following, the
// client-wide setting), then recomputes this employee's earnings/deductions.

export const updateEmployeeComponentSettings = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  if (!isValidMonth(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");
  const employee = await ClientEmployee.findOne({ _id: req.params.employeeId, businessClientId: client._id });
  if (!employee) throw new ApiError(404, "Employee not found");

  const structure = await ClientEmployeeSalaryStructure.findOne({ clientEmployeeId: employee._id, month });
  if (!structure) throw new ApiError(404, "Salary structure not found for this employee/month");

  const { modes = {}, percentages = {}, fixedAmounts = {} } = req.body;
  structure.componentModeOverrides = new Map(Object.entries(modes)) as any;
  structure.componentPercentageOverrides = new Map(Object.entries(percentages).map(([k, v]) => [k, Number(v) || 0])) as any;
  structure.componentFixedAmountOverrides = new Map(Object.entries(fixedAmounts).map(([k, v]) => [k, Number(v) || 0])) as any;

  const settings = await getOrCreateSettings(client._id);
  applyPercentagesToStructure(structure, settings);
  await structure.save();

  res.json({ success: true, data: structure, message: "Employee-specific structure setting saved" });
});

// ── Save structure for the month — computes payroll immediately, no separate
// "Generate" step: as soon as the structure is saved, Total Gross/Deduction/
// Net and every deduction component's total are ready to view. ────────────

// Prorates and totals every employee's structure for a month, writes the
// per-employee ClientPayrollEntry snapshots, and updates the run's totals in
// place (caller saves `run`). Shared by saveStructureForMonth (the only
// trigger now) — used to be a separate "Generate" endpoint.
async function computePayrollForMonth(client, run) {
  const structures = await ClientEmployeeSalaryStructure.find({ businessClientId: client._id, month: run.month });
  if (structures.length === 0) throw new ApiError(400, "No employees in this month's salary structure");

  let totalGross = 0,
    totalDeduction = 0,
    totalNet = 0;
  const deductionTotals: Record<string, number> = {};

  for (const structure of structures) {
    const fullGross = structure.gross || 0;
    const totalWorkingDays = structure.totalWorkingDays || 0;
    const payDays = structure.payDays || 0;
    const perDayRate = totalWorkingDays > 0 ? fullGross / totalWorkingDays : 0;
    // No Total Working Days tracked for this client (that column can be
    // removed via Template Settings) — treat as full attendance rather than
    // zeroing everyone's pay.
    const prorationFactor = totalWorkingDays > 0 ? payDays / totalWorkingDays : 1;

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

    const deductionsSource: Map<string, number> = structure.deductions as any;
    let deductionSum = 0;
    for (const [component, value] of deductionsSource.entries()) {
      const amount = Number(value) || 0;
      deductionSum += amount;
      deductionTotals[component] = (deductionTotals[component] || 0) + amount;
    }
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
        employerPf: structure.employerPf || 0,
        employerEsi: structure.employerEsi || 0,
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
  run.deductionTotals = deductionTotals as any;
}

export const saveStructureForMonth = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  if (!isValidMonth(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");

  const count = await ClientEmployeeSalaryStructure.countDocuments({ businessClientId: client._id, month });
  if (count === 0) throw new ApiError(400, "Import this month's Excel before saving the salary structure");

  const mismatched = await ClientEmployeeSalaryStructure.find({ businessClientId: client._id, month, ctcMismatch: true });
  if (mismatched.length > 0) {
    const employeeIds = mismatched.map((s) => s.clientEmployeeId);
    const employees = await ClientEmployee.find({ _id: { $in: employeeIds } }).select("name").lean();
    const nameById = new Map(employees.map((e) => [String(e._id), e.name]));
    const names = mismatched.map((s) => nameById.get(String(s.clientEmployeeId)) || "Unknown employee");
    throw new ApiError(
      400,
      `CTC mismatch for: ${names.join(", ")} — Gross + Employer PF + Employer ESI must not exceed CTC. Please check and update.`
    );
  }

  const run = await getOrCreateRun(client._id, month);
  run.structureSaved = true;
  run.structureSavedAt = new Date();
  await computePayrollForMonth(client, run);
  await run.save();

  await writeAuditLog(req, {
    action: "client_payroll.structure_saved",
    targetType: "BusinessClient",
    targetId: client._id,
    targetLabel: `${client.name} — ${month}`,
  });

  res.json({ success: true, data: run, message: "Salary structure saved and payroll generated" });
});

export const runPayroll = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  const run = await ClientPayrollRun.findOne({ businessClientId: client._id, month });
  if (!run) throw new ApiError(404, "Payroll run not found");
  if (run.status !== "Generated") throw new ApiError(400, "Save this month's Salary Structure before running payroll");

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
    row["Employer PF"] = e.employerPf ?? 0;
    row["Employer ESI"] = e.employerEsi ?? 0;
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
