import { Response } from "express";
import Payslip from "../../models/hrms/Payslip";
import Payroll from "../../models/hrms/Payroll";
import PayrollRun from "../../models/hrms/PayrollRun";
import generatePayslipPDF from "../../utils/generatePayslipPDF";
import { AuthRequest } from "../../middleware/auth";
import SalaryStructure, { EARNING_FIELDS, DEDUCTION_FIELDS } from "../../models/hrms/SalaryStructure";
import { sendCommonEmail, CommonEmailType } from "../../utils/email";
import { ROLES } from "../../constants";
import { buildPayslipBreakdown } from "../../utils/payslipBreakdown";

const PAYSLIP_DETAIL_POPULATE = {
  path: "user",
  populate: [
    { path: "designationId", select: "name" },
    { path: "departmentId", select: "name" },
    { path: "branchId", select: "name" },
    { path: "companyId", select: "name address logo stamp email phone" },
  ],
  select:
    "name email employeeId joiningDate pan pfNumber uan bankName bankAccountNumber ifscCode elBalance slBalance",
};

/* ================= GENERATE PAYSLIPS FROM PAYROLL ================= */
export const generatePayslipsFromPayroll = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { month } = req.body;
    const { companyId, role } = req.user;

    // 1️⃣ Sirf PAID payroll uthao - Tenant Isolated
    const payrollFilter: any = { month, status: "Paid" };
    if (role !== ROLES.HRMSAdmin) {
        payrollFilter.companyId = companyId;
    }

    const payrolls = await Payroll.find(payrollFilter).populate("employee", "name email");

    if (!payrolls.length) {
      return res.status(404).json({
        message: "No paid payroll found for this month",
      });
    }

    const payrollRuns = await PayrollRun.find({
      month,
      companyId: { $in: Array.from(new Set(payrolls.map((p: any) => String(p.companyId)))) },
    }).lean();
    const payDateByCompany = new Map(payrollRuns.map((r: any) => [String(r.companyId), r.payDate]));

    const createdPayslips = [];

    for (const payroll of payrolls) {
      const employee: any = payroll.employee;
      if (!employee) continue;

      // 2️⃣ Duplicate payslip check - Tenant Isolated
      const exists = await Payslip.findOne({
        user: employee._id,
        month,
        ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
      });

      if (exists) continue;

      // 3️⃣ Salary structure uthao - Tenant Isolated
      const salary = await SalaryStructure.findOne({
        employee: employee._id,
        ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
      });

      if (!salary) continue;

      // 🔍 YTD Calculations
      const [year, monthVal] = month.split("-").map(Number);
      const fiscalYearStartYear = monthVal < 4 ? year - 1 : year;
      const startMonth = `${fiscalYearStartYear}-04`;

      const previousPayslips = await Payslip.find({
        user: employee._id,
        month: { $gte: startMonth, $lt: month },
        ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
      });

      const ytd = (field: string) => {
        const prevTotal = previousPayslips.reduce((acc, curr: any) => acc + (curr[field] || 0), 0);
        return prevTotal + ((salary as any)[field] || 0);
      };

      // Salary breakdown snapshot — every earning/deduction component, not
      // just the legacy basic/hra/pf/professionalTax/tds/advance/others set.
      const componentSnapshot: Record<string, number> = {};
      for (const field of [...EARNING_FIELDS, ...DEDUCTION_FIELDS]) {
        componentSnapshot[field] = (salary as any)[field] || 0;
      }

      // 4️⃣ Payslip create
      const payslip = await Payslip.create({
        user: employee._id,
        payroll: payroll._id,
        month,
        companyId: companyId, // Set companyId

        ...componentSnapshot,

        // Days
        payDays: payroll.payDays || 30,
        lopDays: payroll.lopDays || 0,
        payDate: payDateByCompany.get(String(payroll.companyId)),

        // Attendance breakdown summary
        fullDays: payroll.fullDays || 0,
        lateFullDays: payroll.lateFullDays || 0,
        halfDays: payroll.halfDays || 0,
        lateHalfDays: payroll.lateHalfDays || 0,
        absentDays: payroll.absentDays || 0,
        paidLeaveDays: payroll.paidLeaveDays || 0,
        perDayRate: payroll.perDayRate || 0,
        overtimeHours: payroll.overtimeHours || 0,
        overtimeAmount: payroll.overtimeAmount || 0,
        fixedDeductionAmount: payroll.fixedDeductionAmount || 0,
        lopDeductionAmount: payroll.lopDeductionAmount || 0,

        // YTD Snapshots
        ytdBasic: ytd("basic"),
        ytdHra: ytd("hra"),
        ytdOtherAllowance: ytd("otherAllowance"),
        ytdPf: ytd("pf"),
        ytdProfessionalTax: ytd("professionalTax"),
        ytdTds: ytd("tds"),
        ytdAdvance: ytd("advance"),
        ytdOthers: ytd("others"),

        deduction: payroll.deduction,
        netSalary: payroll.net,
        status: "Generated",
      });

      createdPayslips.push(payslip);

      // 📧 EMAIL SEND
      if (employee.email) {
        await sendCommonEmail({
          type: CommonEmailType.PAYSLIP_GENERATED,
          to: employee.email,
          name: employee.name,
          data: {
            month,
            downloadUrl: `${process.env.FRONTEND_URL}/payslip/${payslip._id}`,
          },
        });
      }
    }

    res.status(201).json({
      message: "Payslips generated successfully",
      count: createdPayslips.length,
      payslips: createdPayslips,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      message: "Payslip generation failed",
      error: error.message,
    });
  }
};


/* ================= HR: GET ALL PAYSLIPS ================= */
export const getAllPayslips = async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {};
    if (req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    }

    const payslips = await Payslip.find(filter)
      .populate("user", "name email role employeeId")
      .populate("payroll")
      .sort({ month: -1, createdAt: -1 });

    res.json(payslips);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};



/* ================= GET SINGLE PAYSLIP DETAIL (for the Pay Stub panel) ================= */
export const getPayslipDetail = async (req: AuthRequest, res: Response) => {
  try {
    const payslip: any = await Payslip.findById(req.params.id)
      .populate(PAYSLIP_DETAIL_POPULATE)
      .populate("payroll");

    if (!payslip) {
      return res.status(404).json({ message: "Payslip not found" });
    }

    if (
      req.user.role !== ROLES.HRMSAdmin &&
      payslip.companyId?.toString() !== req.user.companyId?.toString() &&
      payslip.user?.id !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const breakdown = buildPayslipBreakdown(payslip);
    res.json({ payslip, breakdown });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DOWNLOAD PAYSLIP PDF ================= */
export const downloadPayslipPDF = async (req: AuthRequest, res: Response) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate(PAYSLIP_DETAIL_POPULATE)
      .populate("payroll");

    if (!payslip) {
      return res.status(404).json({ message: "Payslip not found" });
    }

    // Access check
    if (req.user.role !== ROLES.HRMSAdmin && payslip.companyId?.toString() !== req.user.companyId?.toString() && payslip.user?.id !== req.user.id) {
        return res.status(403).json({ message: "Access denied." });
    }

    const pdfPath = await generatePayslipPDF(payslip);

    if (payslip.status !== "Downloaded") {
      payslip.status = "Downloaded";
      payslip.downloadedAt = new Date();
      await payslip.save();
    }

    res.download(pdfPath);
  } catch (error: any) {
    res.status(500).json({
      message: "PDF download failed",
      error: error.message,
    });
  }
};

/* ================= SEND PAYSLIP ================= */
export const sendPayslipToEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const payslip = await Payslip.findById(req.params.id).populate(
      "user",
      "email name"
    );

    if (!payslip) {
      return res.status(404).json({ message: "Payslip not found" });
    }

    // Access check
    if (req.user.role !== ROLES.HRMSAdmin && payslip.companyId?.toString() !== req.user.companyId?.toString()) {
        return res.status(403).json({ message: "Access denied." });
    }

    await generatePayslipPDF(payslip);

    payslip.status = "Sent";
    payslip.sentAt = new Date();
    await payslip.save();

    res.json({ message: "Payslip sent successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to send payslip",
      error: error.message,
    });
  }
};

/* ================= EMPLOYEE: MY PAYSLIPS ================= */
export const getMyPayslips = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const payslips = await Payslip.find({ 
        user: userId,
        ...(req.user.role !== ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
    })
      .populate("payroll")
      .sort({ month: -1 });

    res.json(payslips);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE ALL PAYSLIPS ================= */
export const deleteAllPayslips = async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {};
    if (req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    }

    const result = await Payslip.deleteMany(filter);

    res.json({
      message: "Payslips deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete payslips",
      error: error.message,
    });
  }
};