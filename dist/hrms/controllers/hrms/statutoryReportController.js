"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatutoryReports = exports.generateStatutoryReport = void 0;
const StatutoryReport_1 = __importDefault(require("../../models/hrms/StatutoryReport"));
const SalaryStructure_1 = __importDefault(require("../../models/hrms/SalaryStructure"));
const TaxSlab_1 = __importDefault(require("../../models/hrms/TaxSlab"));
const constants_1 = require("../../constants");
/**
 * 🧮 Calculate TDS based on Tax Slabs
 */
const calculateMonthlyTDS = async (annualIncome) => {
    const slabs = await TaxSlab_1.default.find().sort({ minIncome: 1 });
    let tax = 0;
    for (const slab of slabs) {
        if (annualIncome > slab.minIncome) {
            const taxableInSlab = Math.min(annualIncome, slab.maxIncome || annualIncome) - slab.minIncome;
            if (taxableInSlab > 0) {
                tax += (taxableInSlab * slab.percentage) / 100;
            }
        }
    }
    return Math.round(tax / 12);
};
/**
 * ➕ Generate Statutory Report for a Month
 */
const generateStatutoryReport = async (req, res) => {
    try {
        const { month } = req.body; // YYYY-MM
        const { companyId, role } = req.user;
        if (!month) {
            return res.status(400).json({ message: "Month is required" });
        }
        // 1️⃣ Get all employees with salary structure - Tenant Isolated
        const filter = {};
        if (!req.user.isSystemAdmin && role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = companyId;
        }
        const salaryStructures = await SalaryStructure_1.default.find(filter).populate("employee");
        const reports = [];
        for (const ss of salaryStructures) {
            const employee = ss.employee;
            if (!employee)
                continue;
            const basic = Number(ss.basic) || 0;
            const hra = Number(ss.hra) || 0;
            const otherAllowance = Number(ss.otherAllowance) || 0;
            const monthlyGross = basic + hra + otherAllowance;
            const annualGross = monthlyGross * 12;
            const calculatedTDS = await calculateMonthlyTDS(annualGross);
            const pf = Number(ss.pf) || 0;
            const esi = 0;
            const pt = Number(ss.professionalTax) || 0;
            const tds = calculatedTDS || Number(ss.tds) || 0;
            const totalDeduction = pf + esi + pt + tds;
            const netSalary = Math.max(0, monthlyGross - totalDeduction);
            // 5️⃣ Update or Create Report - Tenant Isolated
            const report = await StatutoryReport_1.default.findOneAndUpdate({ employee: employee._id, month, ...(!req.user.isSystemAdmin && role !== constants_1.ROLES.HRMSAdmin ? { companyId } : {}) }, {
                pf,
                esi,
                pt,
                tds,
                grossSalary: monthlyGross,
                totalDeduction,
                netSalary,
                companyId: companyId, // Set companyId
            }, { upsert: true, new: true });
            reports.push(report);
        }
        res.status(201).json({
            message: "Statutory reports generated successfully",
            count: reports.length,
            reports,
        });
    }
    catch (error) {
        console.error("Generate report error:", error);
        res.status(500).json({
            message: "Failed to generate statutory reports",
            error: error.message,
        });
    }
};
exports.generateStatutoryReport = generateStatutoryReport;
/**
 * 📋 Get Statutory Reports by Month
 */
const getStatutoryReports = async (req, res) => {
    try {
        const { month } = req.query;
        const { companyId, role } = req.user;
        const query = {};
        if (month)
            query.month = month;
        if (!req.user.isSystemAdmin && role !== constants_1.ROLES.HRMSAdmin) {
            query.companyId = companyId;
        }
        const reports = await StatutoryReport_1.default.find(query)
            .populate("employee", "name email")
            .sort({ month: -1, createdAt: -1 });
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch statutory reports",
            error: error.message,
        });
    }
};
exports.getStatutoryReports = getStatutoryReports;
