import BusinessClient from "../models/BusinessClient";
import ClientEmployee from "../models/ClientEmployee";
import ClientPayrollRun from "../models/ClientPayrollRun";
import ClientPayrollEntry from "../models/ClientPayrollEntry";
import ClientPaymentFile from "../models/ClientPaymentFile";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { sendWorkbook } from "../utils/clientPayrollExcel";

async function loadClient(req) {
  const client = await BusinessClient.findOne({ _id: req.params.businessClientId, caFirmId: req.user.caFirmId });
  if (!client) throw new ApiError(404, "Business client not found");
  return client;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export const getPaymentFile = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const paymentFile = await ClientPaymentFile.findOne({ businessClientId: client._id, month: req.params.month }).populate(
    "generatedBy",
    "name"
  );
  const run = await ClientPayrollRun.findOne({ businessClientId: client._id, month: req.params.month });
  res.json({ success: true, data: paymentFile || null, run: run || null });
});

// Generating a Payment File also IS saving it — regenerating overwrites the
// previous doc for this month, mirroring how saveStructureForMonth already
// overwrites ClientPayrollEntry on repeat calls.
export const generatePaymentFile = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;

  const run = await ClientPayrollRun.findOne({ businessClientId: client._id, month });
  if (!run) throw new ApiError(404, "Payroll run not found for this month");
  if (run.status === "Draft") {
    throw new ApiError(400, "Run this month's payroll before generating a Payment File");
  }

  const entries = await ClientPayrollEntry.find({ payrollRunId: run._id }).lean();
  const employeeIds = entries.map((e) => e.clientEmployeeId);
  const employees = await ClientEmployee.find({ _id: { $in: employeeIds } }).lean();
  const employeeById = new Map(employees.map((e) => [String(e._id), e]));

  const rows = entries.map((e) => {
    const employee = employeeById.get(String(e.clientEmployeeId));
    return {
      clientEmployeeId: e.clientEmployeeId,
      employeeCode: employee?.employeeCode || "",
      employeeName: employee?.name || "",
      accountHolderName: employee?.accountHolderName || employee?.name || "",
      bankName: employee?.bankName || "",
      bankAccountNumber: employee?.bankAccountNumber || "",
      bankIfsc: employee?.bankIfsc || "",
      netPayment: e.net || 0,
    };
  });
  const totalAmount = rows.reduce((sum, r) => sum + r.netPayment, 0);

  const paymentFile = await ClientPaymentFile.findOneAndUpdate(
    { businessClientId: client._id, month },
    { businessClientId: client._id, month, rows, totalAmount, generatedBy: req.user.id, generatedAt: new Date() },
    { new: true, upsert: true }
  );

  res.json({ success: true, data: paymentFile, message: "Payment File generated and saved" });
});

export const exportPaymentFile = catchAsync(async (req, res) => {
  const client = await loadClient(req);
  const month = req.params.month;
  const paymentFile = await ClientPaymentFile.findOne({ businessClientId: client._id, month });
  if (!paymentFile) throw new ApiError(404, "Payment File not generated yet for this month");

  const rows = paymentFile.rows.map((r: any) => ({
    "Emp ID": r.employeeCode,
    "Employee Name": r.employeeName,
    "Account holder Name": r.accountHolderName,
    "Bank Name": r.bankName,
    "Bank Account Number": r.bankAccountNumber,
    "IFSC Code": r.bankIfsc,
    "Salary Month": monthLabel(month),
    "Net Payment": r.netPayment,
  }));

  sendWorkbook(res, rows, "Payment File", `${client.name.replace(/[^a-z0-9]/gi, "_")}_Payment_File_${month}.xlsx`);
});
