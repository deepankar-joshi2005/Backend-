import PDFDocument from "pdfkit";

// Mirrors hrms/utils/generatePayslipPDF.ts's visual style (same colors/layout
// language) but for the Excel-based non-HRMS payroll: the Business Client
// stands in for "the company" in the header, and earnings/deductions are
// whatever components that client has configured (dynamic), not a fixed set.
// Builds straight into an in-memory buffer — no persisted Payslip doc/PDF
// file to manage, since this payroll flow has nowhere to store that state.

const GREEN = "#059669";
const GREEN_DARK = "#065f46";
const GRAY = "#6b7280";
const DARK = "#111827";
const LINE = "#e5e7eb";

// pdfkit's standard Helvetica font (WinAnsi encoding) has no ₹ glyph — it
// silently substitutes a garbled/missing character instead of throwing, so
// every amount in the PDF looked "cut off". Rs. is plain ASCII and always renders.
const money = (n: number) => `Rs. ${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export interface ClientPayslipInput {
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  employeeName: string;
  employeeCode: string;
  costCenter?: string;
  month: string; // YYYY-MM
  payDays: number;
  lopDays: number;
  earnings: Record<string, number>;
  deductions: Record<string, number>;
  gross: number;
  totalDeduction: number;
  net: number;
}

export function generateClientPayslipPDF(input: ClientPayslipInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 40;
    const right = 555;

    /* ===== HEADER ===== */
    doc.fillColor(GREEN_DARK).font("Helvetica-Bold").fontSize(18).text(input.clientName?.toUpperCase() || "COMPANY", left, 40);
    doc.fillColor(GRAY).font("Helvetica").fontSize(9);
    if (input.clientAddress) doc.text(input.clientAddress, left, 62, { width: 400 });
    const contactLine = [input.clientEmail, input.clientPhone].filter(Boolean).join("  |  ");
    if (contactLine) doc.text(contactLine, left, 76, { width: 400 });

    doc.moveTo(left, 96).lineTo(right, 96).lineWidth(2).strokeColor(GREEN).stroke();

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(13).text(`Payslip for the month of ${monthLabel(input.month)}`, left, 108);
    doc.moveTo(left, 130).lineTo(right, 130).lineWidth(1).strokeColor(LINE).stroke();

    /* ===== EMPLOYEE PAY SUMMARY ===== */
    const summaryTop = 144;
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(11).text("Employee Pay Summary", left, summaryTop);

    const infoRows: [string, string][] = [
      ["Employee Name:", input.employeeName],
      ["Employee Code:", input.employeeCode],
      ...(input.costCenter ? ([["Cost Center:", input.costCenter]] as [string, string][]) : []),
      ["Pay Days:", String(input.payDays)],
      ["LOP Days:", String(input.lopDays)],
      ["Generated On:", fmtDate(new Date())],
    ];

    let infoY = summaryTop + 20;
    doc.fontSize(9.5);
    infoRows.forEach(([label, value]) => {
      doc.fillColor(GRAY).font("Helvetica").text(label, left, infoY, { width: 110 });
      doc.fillColor(DARK).font("Helvetica-Bold").text(value, left + 110, infoY, { width: 220 });
      infoY += 14;
    });

    doc.fillColor(GRAY).font("Helvetica").fontSize(9).text("Employee Net Pay", 380, summaryTop + 20, { width: 175, align: "right" });
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(24).text(money(input.net), 380, summaryTop + 34, { width: 175, align: "right" });
    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(8.5)
      .text(`Pay Days : ${input.payDays} | LOP Days : ${input.lopDays}`, 380, summaryTop + 62, { width: 175, align: "right" });

    doc.moveTo(left, infoY + 6).lineTo(right, infoY + 6).strokeColor(LINE).stroke();

    /* ===== EARNINGS + DEDUCTIONS (side by side, sized to always fit one page) ===== */
    const earningRows = Object.entries(input.earnings).filter(([, v]) => v > 0);
    const deductionRows = Object.entries(input.deductions).filter(([, v]) => v > 0);

    const PAGE_BOTTOM = 780; // safe usable limit on an A4 page with 40pt margins
    const tablesStartY = infoY + 20;
    const bottomReserved = 28 + 16 + 30 + 10 + 20 + 14; // net pay bar, total-payable line, footer
    const headerH = 18;
    const headerGap = 6;
    const totalRowGap = 8;
    const totalRowH = 16;
    const fixedOverheadPerColumn = headerH + headerGap + totalRowGap + totalRowH;
    const maxRows = Math.max(earningRows.length, deductionRows.length, 1);
    const rowsBudget = PAGE_BOTTOM - tablesStartY - bottomReserved - fixedOverheadPerColumn;
    const rowH = Math.max(9, Math.min(15, rowsBudget / maxRows));
    const rowFontSize = Math.max(6.5, Math.min(9, rowH - 3.5));

    const gap = 20;
    const colWidth = (right - left - gap) / 2;
    const earnX = left;
    const dedX = left + colWidth + gap;

    let y = tablesStartY;
    doc.rect(earnX, y, colWidth, headerH).fill("#ecfdf5");
    doc.rect(dedX, y, colWidth, headerH).fill("#fef2f2");
    doc.font("Helvetica-Bold").fontSize(9.5);
    doc.fillColor(GREEN_DARK).text("Earnings", earnX + 6, y + 4, { width: colWidth - 12 });
    doc.fillColor("#b91c1c").text("Deductions", dedX + 6, y + 4, { width: colWidth - 12 });
    y += headerH + headerGap;

    const rowsTopY = y;
    doc.font("Helvetica").fontSize(rowFontSize);
    if (earningRows.length === 0) {
      doc.fillColor(GRAY).text("No components on file", earnX + 6, y, { width: colWidth - 12 });
    }
    earningRows.forEach(([label, value], i) => {
      const ry = rowsTopY + i * rowH;
      doc.fillColor(DARK).text(label, earnX + 6, ry, { width: colWidth - 78, lineBreak: false });
      doc.text(money(value), earnX + colWidth - 78, ry, { width: 72, align: "right", lineBreak: false });
    });
    if (deductionRows.length === 0) {
      doc.fillColor(GRAY).text("None this month", dedX + 6, y, { width: colWidth - 12 });
    }
    deductionRows.forEach(([label, value], i) => {
      const ry = rowsTopY + i * rowH;
      doc.fillColor(DARK).text(label, dedX + 6, ry, { width: colWidth - 78, lineBreak: false });
      doc.text(money(value), dedX + colWidth - 78, ry, { width: 72, align: "right", lineBreak: false });
    });

    y = rowsTopY + maxRows * rowH + 4;
    doc.moveTo(earnX, y).lineTo(earnX + colWidth, y).strokeColor(LINE).stroke();
    doc.moveTo(dedX, y).lineTo(dedX + colWidth, y).strokeColor(LINE).stroke();
    y += totalRowGap;

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9.5);
    doc.text("Gross Pay", earnX + 6, y, { width: colWidth - 78, lineBreak: false });
    doc.text(money(input.gross), earnX + colWidth - 78, y, { width: 72, align: "right", lineBreak: false });
    doc.text("Total Deductions", dedX + 6, y, { width: colWidth - 78, lineBreak: false });
    doc.text(money(input.totalDeduction), dedX + colWidth - 78, y, { width: 72, align: "right", lineBreak: false });
    y += totalRowH + 12;

    /* ===== NET PAY BAR ===== */
    doc.rect(left, y, right - left, 28).fill(GREEN);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10.5);
    doc.text("NET PAY (Gross Pay - Total Deductions)", left + 10, y + 9, { lineBreak: false });
    doc.text(money(input.net), left, y + 9, { width: right - left - 10, align: "right", lineBreak: false });
    y += 44;

    doc
      .fillColor(DARK)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`Total Net Payable  ${money(input.net)}`, left, y, { width: right - left, align: "center", lineBreak: false });
    y += 30;

    /* ===== FOOTER ===== */
    doc.moveTo(left, y).lineTo(right, y).strokeColor(GREEN).lineWidth(2).stroke();
    y += 10;
    doc
      .fillColor(GRAY)
      .font("Helvetica-Oblique")
      .fontSize(8)
      .text("-- This document has been automatically generated; therefore, a signature is not required. --", left, y, {
        width: right - left,
        align: "center",
      });

    doc.end();
  });
}
