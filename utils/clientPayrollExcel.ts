import xlsx from "xlsx";

// Static, minimal template per the client's own request — Employee Name,
// Basic Salary and Pay Days are all they can reliably give us each month;
// Total Working Days is included so the per-day rate is unambiguous. This is
// intentionally NOT connected to a client's configured salary components
// (those are filled in later via Structure Settings' percentages).
const TEMPLATE_HEADERS = ["Employee Name", "Basic Salary", "Pay Days", "Total Working Days"];
const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function sendWorkbook(res, rows: Record<string, any>[], sheetName: string, filename: string) {
  const sheet = xlsx.utils.json_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, sheetName);
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.header("Content-Type", XLSX_CONTENT_TYPE);
  res.attachment(filename);
  res.send(buffer);
}

// Always the same static shape — a single blank sample row, regardless of
// this client's existing employees or configured components.
export function buildStructureTemplateRows() {
  return [
    {
      "Employee Name": "Sample Employee",
      "Basic Salary": "",
      "Pay Days": "",
      "Total Working Days": "",
    },
  ];
}

export interface ParsedStructureRow {
  row: number;
  employeeName: string;
  basicSalary: number;
  payDays: number;
  totalWorkingDays: number;
}

export function parseStructureWorkbook(buffer: Buffer): { rows: ParsedStructureRow[]; errors: string[] } {
  const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as any[][];

  const errors: string[] = [];
  if (jsonData.length < 2) {
    return { rows: [], errors: ["File must contain a header row and at least one data row"] };
  }

  const headers = (jsonData[0] as string[]).map((h) => String(h || "").trim());
  const colIndex = (label: string) => headers.indexOf(label);
  const missing = TEMPLATE_HEADERS.filter((h) => colIndex(h) === -1);
  if (missing.length > 0) {
    return { rows: [], errors: [`Missing required column(s): ${missing.join(", ")}`] };
  }

  const nameIdx = colIndex("Employee Name");
  const basicIdx = colIndex("Basic Salary");
  const payDaysIdx = colIndex("Pay Days");
  const totalDaysIdx = colIndex("Total Working Days");

  const rows: ParsedStructureRow[] = [];
  const dataRows = jsonData.slice(1);

  dataRows.forEach((raw, i) => {
    const rowNum = i + 2; // account for header row, 1-indexed for humans
    if (!raw || raw.every((cell) => cell === undefined || cell === "")) return;

    const employeeName = String(raw[nameIdx] ?? "").trim();
    if (!employeeName) {
      errors.push(`Row ${rowNum}: Employee Name is required`);
      return;
    }

    const basicSalary = Number(raw[basicIdx]);
    if (raw[basicIdx] === undefined || raw[basicIdx] === "" || Number.isNaN(basicSalary) || basicSalary < 0) {
      errors.push(`Row ${rowNum}: Basic Salary must be a non-negative number`);
      return;
    }

    const payDays = Number(raw[payDaysIdx]);
    if (raw[payDaysIdx] === undefined || raw[payDaysIdx] === "" || Number.isNaN(payDays) || payDays < 0) {
      errors.push(`Row ${rowNum}: Pay Days must be a non-negative number`);
      return;
    }

    const totalWorkingDays = Number(raw[totalDaysIdx]);
    if (
      raw[totalDaysIdx] === undefined ||
      raw[totalDaysIdx] === "" ||
      Number.isNaN(totalWorkingDays) ||
      totalWorkingDays <= 0
    ) {
      errors.push(`Row ${rowNum}: Total Working Days must be a positive number`);
      return;
    }

    if (payDays > totalWorkingDays) {
      errors.push(`Row ${rowNum}: Pay Days (${payDays}) cannot exceed Total Working Days (${totalWorkingDays})`);
      return;
    }

    rows.push({ row: rowNum, employeeName, basicSalary, payDays, totalWorkingDays });
  });

  return { rows, errors };
}
