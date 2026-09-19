/** @format */

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { buildPayslipBreakdown } from "./payslipBreakdown";

const GREEN = "#059669";
const GREEN_DARK = "#065f46";
const GRAY = "#6b7280";
const DARK = "#111827";
const LINE = "#e5e7eb";

const money = (n: number) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const generatePayslipPDF = async (payslip: any) => {
  const pdfDir = path.join(__dirname, "../../uploads/payslips");
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  const pdfPath = path.join(pdfDir, `payslip-${payslip._id}.pdf`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  const user = payslip.user || {};
  const company = user.companyId || { name: "Company", address: "", email: "", phone: "" };
  const b = buildPayslipBreakdown(payslip);

  const left = 40;
  const right = 555;

  /* ===== HEADER ===== */
  doc.fillColor(GREEN_DARK).font("Helvetica-Bold").fontSize(18).text(company.name?.toUpperCase() || "COMPANY", left, 40);
  doc.fillColor(GRAY).font("Helvetica").fontSize(9);
  if (company.address) doc.text(company.address, left, 62, { width: 400 });
  const contactLine = [company.email, company.phone].filter(Boolean).join("  |  ");
  if (contactLine) doc.text(contactLine, left, 76, { width: 400 });

  doc.moveTo(left, 96).lineTo(right, 96).lineWidth(2).strokeColor(GREEN).stroke();

  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(13).text(`Payslip for the month of ${monthLabel(payslip.month)}`, left, 108);

  doc.moveTo(left, 130).lineTo(right, 130).lineWidth(1).strokeColor(LINE).stroke();

  /* ===== EMPLOYEE PAY SUMMARY ===== */
  const summaryTop = 144;
  doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(11).text("Employee Pay Summary", left, summaryTop);

  const [py, pm] = payslip.month.split("-").map(Number);
  const periodStart = new Date(py, pm - 1, 1);
  const periodEnd = new Date(py, pm, 0);
  const fmtShort = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const infoRows: [string, string][] = [
    ["Employee Name:", `${user.name || ""}${user.employeeId ? `, ${user.employeeId}` : ""}`],
    ["Email:", user.email || "-"],
    ["Bank Name:", user.bankName || "-"],
    ["Account Number:", user.bankAccountNumber || "-"],
    ["Pay Period:", `${fmtShort(periodStart)} - ${fmtShort(periodEnd)}`],
    ["Pay Date:", payslip.payDate ? fmtDate(new Date(payslip.payDate)) : "-"],
    ["Generated On:", fmtDate(new Date(payslip.createdAt))],
  ];

  let infoY = summaryTop + 20;
  doc.fontSize(9.5);
  infoRows.forEach(([label, value]) => {
    doc.fillColor(GRAY).font("Helvetica").text(label, left, infoY, { width: 110 });
    doc.fillColor(DARK).font("Helvetica-Bold").text(value, left + 110, infoY, { width: 220 });
    infoY += 16;
  });

  // Net pay callout, top-right
  doc.fillColor(GRAY).font("Helvetica").fontSize(9).text("Employee Net Pay", 380, summaryTop + 20, { width: 175, align: "right" });
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(24).text(money(b.netPay), 380, summaryTop + 34, { width: 175, align: "right" });
  doc
    .fillColor(GRAY)
    .font("Helvetica")
    .fontSize(8.5)
    .text(`Paid Days : ${b.effectivePaidDays.toFixed(2)} | LOP Days : ${b.lopDays.toFixed(2)}`, 380, summaryTop + 62, { width: 175, align: "right" });

  doc.moveTo(left, infoY + 6).lineTo(right, infoY + 6).strokeColor(LINE).stroke();

  /* ===== ATTENDANCE SUMMARY ===== */
  let y = infoY + 20;
  doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(11).text("Attendance Summary", left, y);
  y += 18;

  const cols = [
    ["Working Days", b.workingDays.toString()],
    ["Full Present", (b.presentDays - 0.5 * b.halfDays).toFixed(0)],
    ["Half Days", b.halfDays.toFixed(2)],
    ["Holidays", b.holidayDays.toString()],
    ["Paid Leave", b.paidLeaveDays.toFixed(2)],
    ["Unpaid Leave", b.unpaidLeaveDays.toFixed(2)],
    ["Absent", b.absentDays.toString()],
    ["LOP Days", b.lopDays.toFixed(2)],
    ["Overtime Hrs", b.overtimeHours.toFixed(2)],
  ];
  const colWidth = (right - left) / cols.length;

  doc.rect(left, y, right - left, 18).fill("#ecfdf5");
  doc.fillColor(GREEN_DARK).font("Helvetica-Bold").fontSize(7.5);
  cols.forEach((c, i) => doc.text(c[0], left + i * colWidth, y + 5, { width: colWidth - 4, align: "center" }));

  y += 18;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9.5);
  cols.forEach((c, i) => doc.text(c[1], left + i * colWidth, y + 5, { width: colWidth - 4, align: "center" }));

  y += 24;
  doc.moveTo(left, y).lineTo(left, y + 22).lineWidth(2).strokeColor(GREEN).stroke();
  doc
    .fillColor(GRAY)
    .font("Helvetica")
    .fontSize(8)
    .text(
      `Present Days = Full Present (${(b.presentDays - 0.5 * b.halfDays).toFixed(0)}) + Holidays (${b.holidayDays}) + Paid Leave (${b.paidLeaveDays.toFixed(
        2
      )}) + Half Days x 0.5 (${b.halfDays.toFixed(2)} x 0.5) = ${b.presentDays.toFixed(2)}   |   Overtime = ${b.overtimeHours.toFixed(2)} hrs = ${money(
        b.overtimeAmount
      )}`,
      left + 8,
      y + 4,
      { width: right - left - 8 }
    );

  y += 30;

  /* ===== EARNINGS ===== */
  doc.rect(left, y, right - left, 20).fill("#ecfdf5");
  doc.fillColor(GREEN_DARK).font("Helvetica-Bold").fontSize(10);
  doc.text("Earnings", left + 8, y + 5);
  doc.text("Amount", left, y + 5, { width: right - left - 8, align: "right" });
  y += 26;

  const grossEarnings = b.totalEarnings + b.overtimeAmount + b.encashmentBonus;
  const earningRows: [string, number][] = [
    ["Basic Salary", b.basic],
    ["Other Allowance", b.otherAllowance],
    ["House Rent Allowance (HRA)", b.hra],
  ];
  if (b.overtimeAmount > 0) earningRows.push(["Overtime Amount", b.overtimeAmount]);
  if (b.encashmentBonus > 0) earningRows.push(["Leave Encashment", b.encashmentBonus]);

  doc.font("Helvetica").fontSize(9.5);
  earningRows.forEach(([label, value]) => {
    doc.fillColor(DARK).text(label, left + 8, y);
    doc.text(money(value), left, y, { width: right - left - 8, align: "right" });
    y += 17;
  });

  doc.moveTo(left, y + 2).lineTo(right, y + 2).strokeColor(LINE).stroke();
  y += 8;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10);
  doc.text("Gross Earnings", left + 8, y);
  doc.text(money(grossEarnings), left, y, { width: right - left - 8, align: "right" });
  y += 28;

  /* ===== DEDUCTIONS ===== */
  doc.rect(left, y, right - left, 20).fill("#fef2f2");
  doc.fillColor("#b91c1c").font("Helvetica-Bold").fontSize(10);
  doc.text("Deductions", left + 8, y + 5);
  doc.text("(-) Amount", left, y + 5, { width: right - left - 8, align: "right" });
  y += 26;

  const deductionRows: [string, number][] = [];
  if (b.professionalTax > 0) deductionRows.push(["Professional Tax", b.professionalTax]);
  if (b.pf > 0) deductionRows.push(["Provident Fund (PF)", b.pf]);
  if (b.tds > 0) deductionRows.push(["Income Tax (TDS)", b.tds]);
  if (b.advance > 0) deductionRows.push(["Advance", b.advance]);
  if (b.others > 0) deductionRows.push(["Others", b.others]);
  if (b.lopDeductionAmount > 0) deductionRows.push([`LOP Deduction (${(b.lopDays - b.unpaidLeaveDays).toFixed(2)} days)`, b.lopDeductionAmount]);
  if (b.unpaidLeaveDeductionAmount > 0) deductionRows.push([`Unpaid Leave Deduction (${b.unpaidLeaveDays.toFixed(2)} days)`, b.unpaidLeaveDeductionAmount]);

  doc.font("Helvetica").fontSize(9.5);
  deductionRows.forEach(([label, value]) => {
    doc.fillColor(DARK).text(label, left + 8, y);
    doc.text(money(value), left, y, { width: right - left - 8, align: "right" });
    y += 17;
  });

  const totalDeductions = b.totalComponentDeductions + b.lopDeductionAmount + b.unpaidLeaveDeductionAmount;

  doc.moveTo(left, y + 2).lineTo(right, y + 2).strokeColor(LINE).stroke();
  y += 8;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10);
  doc.text("Total Deductions", left + 8, y);
  doc.text(money(totalDeductions), left, y, { width: right - left - 8, align: "right" });
  y += 26;

  /* ===== NET PAY BAR ===== */
  doc.rect(left, y, right - left, 28).fill(GREEN);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10.5);
  doc.text("NET PAY (Gross Earnings - Total Deductions)", left + 10, y + 9);
  doc.text(money(grossEarnings - totalDeductions), left, y + 9, { width: right - left - 10, align: "right" });
  y += 44;

  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(12).text(`Total Net Payable  ${money(b.netPay)}`, left, y, { width: right - left, align: "center" });
  y += 30;

  /* ===== COMPANY STAMP ===== */
  let stampDrawn = false;
  if (company.stamp) {
    try {
      const stampPath = path.join(__dirname, "../../", String(company.stamp).replace(/^\//, ""));
      if (fs.existsSync(stampPath)) {
        const stampSize = 80;
        doc.image(stampPath, right - stampSize, y, { width: stampSize, height: stampSize });
        stampDrawn = true;
      }
    } catch (err) {
      console.error("Failed to load company stamp:", err);
    }
  }
  y += stampDrawn ? 90 : 14;

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

  return new Promise<string>((resolve) => {
    writeStream.on("finish", async () => {
      payslip.pdfPath = pdfPath;
      await payslip.save();
      resolve(pdfPath);
    });
  });
};

export default generatePayslipPDF;
