"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompany = exports.uploadCompanyStamp = exports.uploadCompanyLogo = exports.updateCompany = exports.getCompanyById = exports.getAllCompanies = exports.createCompany = void 0;
const Company_1 = __importDefault(require("../../models/hrms/Company"));
const User_1 = __importDefault(require("../../models/User"));
const constants_1 = require("../../constants");
const isCompanyScoped = (req) => !req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin;
const canAccessCompany = (req, companyId) => { var _a; return !isCompanyScoped(req) || (companyId === null || companyId === void 0 ? void 0 : companyId.toString()) === ((_a = req.user.companyId) === null || _a === void 0 ? void 0 : _a.toString()); };
/**
 * ➕ Create Company
 * POST /api/companies
 */
const createCompany = async (req, res) => {
    try {
        const { name, email, phone, website, industry, address, city, state, status } = req.body;
        const logo = req.file ? `/uploads/company-logos/${req.file.filename}` : "";
        if (!name || !email || !phone || !industry || !address) {
            return res.status(400).json({
                message: "All required fields must be provided",
            });
        }
        /* ================= COMPANY ID GENERATE ================= */
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2); // 2026 -> 26
        const month = String(now.getMonth() + 1).padStart(2, "0"); // 02
        const prefix = `${year}${month}`; // 2602
        // last company find
        const lastCompany = await Company_1.default.findOne({
            companyId: new RegExp(`^${prefix}`)
        }).sort({ companyId: -1 });
        let runningNumber = 1;
        if (lastCompany === null || lastCompany === void 0 ? void 0 : lastCompany.companyId) {
            const lastNumber = parseInt(lastCompany.companyId.slice(4));
            runningNumber = lastNumber + 1;
        }
        const companyId = prefix + String(runningNumber).padStart(4, "0");
        /* ================= CREATE ================= */
        const company = await Company_1.default.create({
            name,
            email,
            phone,
            website,
            industry,
            address,
            city,
            state,
            status,
            logo,
            companyId, // NEW
            createdBy: req.user.id,
        });
        return res.status(201).json({
            message: "Company created successfully",
            data: company,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to create company",
            error: error.message,
        });
    }
};
exports.createCompany = createCompany;
/**
 * 📄 Get All Companies
 * GET /api/companies
 */
const getAllCompanies = async (req, res) => {
    try {
        let query = {};
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            query = { _id: req.user.companyId };
        }
        const companies = await Company_1.default.find(query).sort({ createdAt: -1 });
        return res.status(200).json(companies);
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to fetch companies",
            error: error.message,
        });
    }
};
exports.getAllCompanies = getAllCompanies;
/**
 * 🔍 Get Single Company
 * GET /api/companies/:id
 */
const getCompanyById = async (req, res) => {
    try {
        const company = await Company_1.default.findById(req.params.id);
        if (!company) {
            return res.status(404).json({
                message: "Company not found",
            });
        }
        if (!canAccessCompany(req, company._id)) {
            return res.status(403).json({ message: "Access denied." });
        }
        // 💳 SMART BILLING PREVIEW LOGIC (Sync with saasController.ts)
        const now = new Date();
        const lastBill = new Date(company.lastBillingDate || company.createdAt);
        // 1. Calculate Unbilled "Live" Usage for currently active users
        const activeUsers = await User_1.default.find({ companyId: company._id, status: "ACTIVE" });
        let liveUsageDays = 0;
        activeUsers.forEach(u => {
            if (u.activeSince) {
                const start = new Date(Math.max(new Date(u.activeSince).getTime(), lastBill.getTime()));
                const diff = now.getTime() - start.getTime();
                liveUsageDays += Math.max(diff / (1000 * 60 * 60 * 24), 0);
            }
        });
        // 2. Total Days Consumed = Unbilled from Deleted Users + Live Active Users
        const totalDaysConsumed = (company.unbilledUsageDays || 0) + liveUsageDays;
        // 3. Prepaid Days = (Old Limit * Days in Cycle)
        const daysInCycle = Math.max((now.getTime() - lastBill.getTime()) / (1000 * 60 * 60 * 24), 1);
        const prepaidUserDays = (company.employeeLimit || 0) * daysInCycle;
        // 4. Calculate Overage
        const overageDays = Math.max(totalDaysConsumed - prepaidUserDays, 0);
        const overageCharge = Math.round(overageDays * (25 / 30));
        // 5. Next Month Base & Total
        const activeUserCount = activeUsers.length;
        const baseCharge = activeUserCount * 25;
        const upcomingBill = baseCharge + overageCharge;
        return res.status(200).json({
            ...company.toObject(),
            activeUserCount,
            overageCharge,
            baseCharge,
            upcomingBill
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to fetch company",
            error: error.message,
        });
    }
};
exports.getCompanyById = getCompanyById;
/**
 * ✏️ Update Company
 * PUT /api/companies/:id
 */
const updateCompany = async (req, res) => {
    try {
        const existing = await Company_1.default.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: "Company not found" });
        }
        if (!canAccessCompany(req, existing._id)) {
            return res.status(403).json({ message: "Access denied." });
        }
        const updateData = { ...req.body };
        if (req.file) {
            updateData.logo = `/uploads/company-logos/${req.file.filename}`;
        }
        const updatedCompany = await Company_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true });
        return res.status(200).json({
            message: "Company updated successfully",
            data: updatedCompany,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to update company",
            error: error.message,
        });
    }
};
exports.updateCompany = updateCompany;
/**
 * 🖼️ Upload / Replace Company Logo (self-service — shown at the top of the Sidebar)
 * PUT /api/companies/:id/logo
 */
const uploadCompanyLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const company = await Company_1.default.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        if (!canAccessCompany(req, company._id)) {
            return res.status(403).json({ message: "Access denied." });
        }
        company.logo = `/uploads/company-logos/${req.file.filename}`;
        await company.save();
        return res.status(200).json({ message: "Logo updated successfully", logoUrl: company.logo });
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to upload logo", error: error.message });
    }
};
exports.uploadCompanyLogo = uploadCompanyLogo;
/**
 * 🖋️ Upload / Replace Company Stamp (printed on payslip PDFs)
 * PUT /api/companies/:id/stamp
 */
const uploadCompanyStamp = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const company = await Company_1.default.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        if (!canAccessCompany(req, company._id)) {
            return res.status(403).json({ message: "Access denied." });
        }
        company.stamp = `/uploads/company-stamps/${req.file.filename}`;
        await company.save();
        return res.status(200).json({ message: "Stamp updated successfully", stampUrl: company.stamp });
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to upload stamp", error: error.message });
    }
};
exports.uploadCompanyStamp = uploadCompanyStamp;
/**
 * 🗑 Delete Company
 * DELETE /api/companies/:id
 */
const deleteCompany = async (req, res) => {
    try {
        const deletedCompany = await Company_1.default.findByIdAndDelete(req.params.id);
        if (!deletedCompany) {
            return res.status(404).json({
                message: "Company not found",
            });
        }
        return res.status(200).json({
            message: "Company deleted successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to delete company",
            error: error.message,
        });
    }
};
exports.deleteCompany = deleteCompany;
