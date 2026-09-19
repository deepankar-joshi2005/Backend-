"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllPayslips = exports.getMyPayslips = exports.sendPayslipToEmployee = exports.downloadPayslipPDF = exports.getPayslipDetail = exports.getAllPayslips = exports.generatePayslipsFromPayroll = void 0;
const Payslip_1 = __importDefault(require("../../models/hrms/Payslip"));
const Payroll_1 = __importDefault(require("../../models/hrms/Payroll"));
const PayrollRun_1 = __importDefault(require("../../models/hrms/PayrollRun"));
const generatePayslipPDF_1 = __importDefault(require("../../utils/generatePayslipPDF"));
const SalaryStructure_1 = __importDefault(require("../../models/hrms/SalaryStructure"));
const email_1 = require("../../utils/email");
const constants_1 = require("../../constants");
const payslipBreakdown_1 = require("../../utils/payslipBreakdown");
const PAYSLIP_DETAIL_POPULATE = {
    path: "user",
    populate: [
        { path: "designationId", select: "name" },
        { path: "departmentId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "companyId", select: "name address logo stamp email phone" },
    ],
    select: "name email employeeId joiningDate pan pfNumber uan bankName bankAccountNumber ifscCode elBalance slBalance",
};
/* ================= GENERATE PAYSLIPS FROM PAYROLL ================= */
const generatePayslipsFromPayroll = async (req, res) => {
    try {
        const { month } = req.body;
        const { companyId, role } = req.user;
        // 1️⃣ Sirf PAID payroll uthao - Tenant Isolated
        const payrollFilter = { month, status: "Paid" };
        if (role !== constants_1.ROLES.HRMSAdmin) {
            payrollFilter.companyId = companyId;
        }
        const payrolls = await Payroll_1.default.find(payrollFilter).populate("employee", "name email");
        if (!payrolls.length) {
            return res.status(404).json({
                message: "No paid payroll found for this month",
            });
        }
        const payrollRuns = await PayrollRun_1.default.find({
            month,
            companyId: { $in: Array.from(new Set(payrolls.map((p) => String(p.companyId)))) },
        }).lean();
        const payDateByCompany = new Map(payrollRuns.map((r) => [String(r.companyId), r.payDate]));
        const createdPayslips = [];
        for (const payroll of payrolls) {
            const employee = payroll.employee;
            if (!employee)
                continue;
            // 2️⃣ Duplicate payslip check - Tenant Isolated
            const exists = await Payslip_1.default.findOne({
                user: employee._id,
                month,
                ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
            });
            if (exists)
                continue;
            // 3️⃣ Salary structure uthao - Tenant Isolated
            const salary = await SalaryStructure_1.default.findOne({
                employee: employee._id,
                ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
            });
            if (!salary)
                continue;
            // 🔍 YTD Calculations
            const [year, monthVal] = month.split("-").map(Number);
            const fiscalYearStartYear = monthVal < 4 ? year - 1 : year;
            const startMonth = `${fiscalYearStartYear}-04`;
            const previousPayslips = await Payslip_1.default.find({
                user: employee._id,
                month: { $gte: startMonth, $lt: month },
                ...(role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {})
            });
            const ytd = (field) => {
                const prevTotal = previousPayslips.reduce((acc, curr) => acc + (curr[field] || 0), 0);
                return prevTotal + (salary[field] || 0);
            };
            // 4️⃣ Payslip create
            const payslip = await Payslip_1.default.create({
                user: employee._id,
                payroll: payroll._id,
                month,
                companyId: companyId, // Set companyId
                // Salary breakdown snapshot
                basic: salary.basic,
                hra: salary.hra,
                otherAllowance: salary.otherAllowance,
                pf: salary.pf,
                professionalTax: salary.professionalTax,
                tds: salary.tds,
                advance: salary.advance,
                others: salary.others,
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
                await (0, email_1.sendCommonEmail)({
                    type: email_1.CommonEmailType.PAYSLIP_GENERATED,
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Payslip generation failed",
            error: error.message,
        });
    }
};
exports.generatePayslipsFromPayroll = generatePayslipsFromPayroll;
/* ================= HR: GET ALL PAYSLIPS ================= */
const getAllPayslips = async (req, res) => {
    try {
        const filter = {};
        if (req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        const payslips = await Payslip_1.default.find(filter)
            .populate("user", "name email role employeeId")
            .populate("payroll")
            .sort({ month: -1, createdAt: -1 });
        res.json(payslips);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllPayslips = getAllPayslips;
/* ================= GET SINGLE PAYSLIP DETAIL (for the Pay Stub panel) ================= */
const getPayslipDetail = async (req, res) => {
    var _a, _b, _c;
    try {
        const payslip = await Payslip_1.default.findById(req.params.id)
            .populate(PAYSLIP_DETAIL_POPULATE)
            .populate("payroll");
        if (!payslip) {
            return res.status(404).json({ message: "Payslip not found" });
        }
        if (req.user.role !== constants_1.ROLES.HRMSAdmin &&
            ((_a = payslip.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString()) &&
            ((_c = payslip.user) === null || _c === void 0 ? void 0 : _c.id) !== req.user.id) {
            return res.status(403).json({ message: "Access denied." });
        }
        const breakdown = (0, payslipBreakdown_1.buildPayslipBreakdown)(payslip);
        res.json({ payslip, breakdown });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPayslipDetail = getPayslipDetail;
/* ================= DOWNLOAD PAYSLIP PDF ================= */
const downloadPayslipPDF = async (req, res) => {
    var _a, _b, _c;
    try {
        const payslip = await Payslip_1.default.findById(req.params.id)
            .populate(PAYSLIP_DETAIL_POPULATE)
            .populate("payroll");
        if (!payslip) {
            return res.status(404).json({ message: "Payslip not found" });
        }
        // Access check
        if (req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = payslip.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString()) && ((_c = payslip.user) === null || _c === void 0 ? void 0 : _c.id) !== req.user.id) {
            return res.status(403).json({ message: "Access denied." });
        }
        const pdfPath = await (0, generatePayslipPDF_1.default)(payslip);
        if (payslip.status !== "Downloaded") {
            payslip.status = "Downloaded";
            payslip.downloadedAt = new Date();
            await payslip.save();
        }
        res.download(pdfPath);
    }
    catch (error) {
        res.status(500).json({
            message: "PDF download failed",
            error: error.message,
        });
    }
};
exports.downloadPayslipPDF = downloadPayslipPDF;
/* ================= SEND PAYSLIP ================= */
const sendPayslipToEmployee = async (req, res) => {
    var _a, _b;
    try {
        const payslip = await Payslip_1.default.findById(req.params.id).populate("user", "email name");
        if (!payslip) {
            return res.status(404).json({ message: "Payslip not found" });
        }
        // Access check
        if (req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = payslip.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        await (0, generatePayslipPDF_1.default)(payslip);
        payslip.status = "Sent";
        payslip.sentAt = new Date();
        await payslip.save();
        res.json({ message: "Payslip sent successfully" });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to send payslip",
            error: error.message,
        });
    }
};
exports.sendPayslipToEmployee = sendPayslipToEmployee;
/* ================= EMPLOYEE: MY PAYSLIPS ================= */
const getMyPayslips = async (req, res) => {
    try {
        const userId = req.user.id;
        const payslips = await Payslip_1.default.find({
            user: userId,
            ...(req.user.role !== constants_1.ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
        })
            .populate("payroll")
            .sort({ month: -1 });
        res.json(payslips);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyPayslips = getMyPayslips;
/* ================= DELETE ALL PAYSLIPS ================= */
const deleteAllPayslips = async (req, res) => {
    try {
        const filter = {};
        if (req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        const result = await Payslip_1.default.deleteMany(filter);
        res.json({
            message: "Payslips deleted successfully",
            deletedCount: result.deletedCount,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to delete payslips",
            error: error.message,
        });
    }
};
exports.deleteAllPayslips = deleteAllPayslips;
