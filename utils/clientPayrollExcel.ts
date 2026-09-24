import xlsx from "xlsx";

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface TemplateColumn {
  key: string;
  label: string;
  role: "employeeName" | "ctc" | "payDays" | "totalWorkingDays" | "custom";
  dataType: "text" | "number" | "date";
  order: number;
}

export function sendWorkbook(res, rows: Record<string, any>[], sheetName: string, filename: string) {
  const sheet = xlsx.utils.json_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, sheetName);
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.header("Content-Type", XLSX_CONTENT_TYPE);
  res.attachment(filename);
  res.send(buffer);
}

function sortColumns(columns: TemplateColumn[]) {
  return [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// A single blank sample row shaped by this client's current Template Settings
// — column set and order are entirely driven by templateColumns now, not a
// fixed shape. See ClientPayrollSettings.templateColumns.
export function buildStructureTemplateRows(templateColumns: TemplateColumn[]) {
  const row: Record<string, any> = {};
  for (const col of sortColumns(templateColumns)) {
    row[col.label] = col.role === "employeeName" ? "Sample Employee" : "";
  }
  return [row];
}

export interface ParsedStructureRow {
  row: number;
  employeeName: string;
  // Present only when the corresponding role column is still configured —
  // a client that has deleted e.g. "Total Working Days" from their template
  // simply won't have totalWorkingDays on parsed rows.
  // ctc is also undefined when the column is configured but the cell was left
  // blank — that's not an error here, it means "carry forward last month's
  // CTC for this employee", resolved later where the DB is reachable (see
  // resolveCtc in clientPayrollController.ts).
  ctc?: number;
  // Set (in clientPayrollController.ts, not here) when a blank CTC cell was
  // resolved by carrying forward the employee's most recent prior CTC.
  ctcCarriedForward?: boolean;
  payDays?: number;
  totalWorkingDays?: number;
  customFields: Record<string, string>;
}

export function parseStructureWorkbook(
  buffer: Buffer,
  templateColumns: TemplateColumn[]
): { rows: ParsedStructureRow[]; errors: string[] } {
  const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as any[][];

  if (jsonData.length < 2) {
    return { rows: [], errors: ["File must contain a header row and at least one data row"] };
  }

  const headers = (jsonData[0] as string[]).map((h) => String(h || "").trim());
  const colIndex = (label: string) => headers.indexOf(label);

  const byRole = (role: TemplateColumn["role"]) => templateColumns.find((c) => c.role === role);
  const employeeNameCol = byRole("employeeName");
  if (!employeeNameCol) {
    return { rows: [], errors: ["No Employee Name column is configured — add one in Template Settings"] };
  }
  const ctcCol = byRole("ctc");
  const payDaysCol = byRole("payDays");
  const totalWorkingDaysCol = byRole("totalWorkingDays");
  const customCols = templateColumns.filter((c) => c.role === "custom");

  const missing: string[] = [];
  for (const col of [employeeNameCol, ctcCol, payDaysCol, totalWorkingDaysCol]) {
    if (col && colIndex(col.label) === -1) missing.push(col.label);
  }
  if (missing.length > 0) {
    return { rows: [], errors: [`Missing required column(s): ${missing.join(", ")}`] };
  }

  const nameIdx = colIndex(employeeNameCol.label);
  const ctcIdx = ctcCol ? colIndex(ctcCol.label) : -1;
  const payDaysIdx = payDaysCol ? colIndex(payDaysCol.label) : -1;
  const totalDaysIdx = totalWorkingDaysCol ? colIndex(totalWorkingDaysCol.label) : -1;

  const errors: string[] = [];
  const rows: ParsedStructureRow[] = [];
  const dataRows = jsonData.slice(1);

  dataRows.forEach((raw, i) => {
    const rowNum = i + 2; // account for header row, 1-indexed for humans
    if (!raw || raw.every((cell) => cell === undefined || cell === "")) return;

    const employeeName = String(raw[nameIdx] ?? "").trim();
    if (!employeeName) {
      errors.push(`Row ${rowNum}: ${employeeNameCol.label} is required`);
      return;
    }

    let ctc: number | undefined;
    if (ctcCol) {
      const cellBlank = raw[ctcIdx] === undefined || raw[ctcIdx] === "";
      if (!cellBlank) {
        ctc = Number(raw[ctcIdx]);
        if (Number.isNaN(ctc) || ctc < 0) {
          errors.push(`Row ${rowNum}: ${ctcCol.label} must be a non-negative number`);
          return;
        }
      }
      // Blank CTC cell is left as undefined here (not an error) — the caller
      // resolves it by carrying forward the employee's most recent CTC.
    }

    let payDays: number | undefined;
    if (payDaysCol) {
      payDays = Number(raw[payDaysIdx]);
      if (raw[payDaysIdx] === undefined || raw[payDaysIdx] === "" || Number.isNaN(payDays) || payDays < 0) {
        errors.push(`Row ${rowNum}: ${payDaysCol.label} must be a non-negative number`);
        return;
      }
    }

    let totalWorkingDays: number | undefined;
    if (totalWorkingDaysCol) {
      totalWorkingDays = Number(raw[totalDaysIdx]);
      if (
        raw[totalDaysIdx] === undefined ||
        raw[totalDaysIdx] === "" ||
        Number.isNaN(totalWorkingDays) ||
        totalWorkingDays <= 0
      ) {
        errors.push(`Row ${rowNum}: ${totalWorkingDaysCol.label} must be a positive number`);
        return;
      }
    }

    if (payDays !== undefined && totalWorkingDays !== undefined && payDays > totalWorkingDays) {
      errors.push(
        `Row ${rowNum}: ${payDaysCol!.label} (${payDays}) cannot exceed ${totalWorkingDaysCol!.label} (${totalWorkingDays})`
      );
      return;
    }

    const customFields: Record<string, string> = {};
    for (const col of customCols) {
      const idx = colIndex(col.label);
      if (idx === -1) continue;
      const cell = raw[idx];
      if (cell === undefined || cell === null || cell === "") {
        customFields[col.key] = "";
      } else if (cell instanceof Date) {
        customFields[col.key] = cell.toISOString().slice(0, 10);
      } else {
        customFields[col.key] = String(cell);
      }
    }

    rows.push({ row: rowNum, employeeName, ctc, payDays, totalWorkingDays, customFields });
  });

  return { rows, errors };
}
