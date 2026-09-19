"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestSubscriptionChange = exports.getPlanCatalog = exports.updateMyFirm = exports.getMyFirm = exports.getMyFirmPlan = exports.updateSubscription = exports.updateCaFirm = exports.deleteCaFirm = exports.getCaFirm = exports.resetFirmAdminPassword = exports.createCaFirm = exports.listCaFirms = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const CaFirm_1 = __importStar(require("../models/CaFirm"));
const User_1 = __importDefault(require("../models/User"));
const BusinessClient_1 = __importDefault(require("../models/BusinessClient"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const slugify_1 = require("../utils/slugify");
const generatePassword_1 = require("../utils/generatePassword");
const paginate_1 = require("../utils/paginate");
const getSystemSettings_1 = require("../utils/getSystemSettings");
const writeAuditLog_1 = require("../utils/writeAuditLog");
const createNotification_1 = require("../utils/createNotification");
const sendMail_1 = require("../utils/sendMail");
const emailTemplates_1 = require("../utils/emailTemplates");
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
exports.listCaFirms = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, skip } = (0, paginate_1.getPagination)(req.query);
    const filter = {};
    if (req.query.search) {
        filter.name = { $regex: req.query.search, $options: "i" };
    }
    switch (req.query.tab) {
        case "active":
            filter["plan.status"] = "active";
            filter.isActive = true;
            break;
        case "trial":
            filter["plan.status"] = "trial";
            break;
        case "expired":
            filter["plan.status"] = "expired";
            break;
        case "suspended":
            filter.$or = [{ isActive: false }, { "plan.status": "suspended" }];
            break;
        default:
            break;
    }
    const [firms, total] = await Promise.all([
        CaFirm_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        CaFirm_1.default.countDocuments(filter),
    ]);
    res.json({ success: true, data: firms, meta: (0, paginate_1.buildMeta)({ page, limit, total }) });
});
// Super Admin onboarding flow (see Super Admin flowchart, Part 1-2): create
// the firm tenant record, auto-generate CA Firm Admin credentials.
exports.createCaFirm = (0, catchAsync_1.default)(async (req, res) => {
    const { name, email, phone, address, icaiRegistrationNumber, constitutionType, pan, gstin, planTier, billingCycle, adminName, adminEmail, adminPassword, adminDesignation, adminMembershipNo, } = req.body;
    const existingAdmin = await User_1.default.findOne({ email: adminEmail });
    if (existingAdmin)
        throw new ApiError_1.default(409, "An account with this admin email already exists");
    if (icaiRegistrationNumber) {
        const existingFirm = await CaFirm_1.default.findOne({ icaiRegistrationNumber });
        if (existingFirm)
            throw new ApiError_1.default(409, "A CA firm with this ICAI registration number already exists");
    }
    const settings = await (0, getSystemSettings_1.getSystemSettings)();
    const trialDays = settings.defaultTrialDays;
    const slug = await (0, slugify_1.generateUniqueSlug)(name);
    const tier = planTier || "starter";
    const cycle = billingCycle || "monthly";
    const limits = CaFirm_1.PLAN_LIMITS[tier];
    const firm = await CaFirm_1.default.create({
        name,
        slug,
        email,
        phone,
        icaiRegistrationNumber: icaiRegistrationNumber || undefined,
        constitutionType: constitutionType || undefined,
        pan: pan || undefined,
        gstin: gstin || undefined,
        address,
        plan: {
            tier,
            status: "trial",
            seatLimit: limits.seatLimit,
            businessClientLimit: limits.businessClientLimit,
            billingCycle: cycle,
            startDate: new Date(),
            expiryDate: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
        },
        createdBy: req.user.id,
    });
    // If the super admin sets a password directly, the admin can log in with it
    // immediately (no forced reset). Otherwise fall back to a one-time temp password.
    const usingOwnPassword = !!adminPassword;
    const tempPassword = usingOwnPassword ? null : (0, generatePassword_1.generateTempPassword)();
    let admin;
    try {
        const passwordHash = await bcryptjs_1.default.hash(usingOwnPassword ? adminPassword : tempPassword, SALT_ROUNDS);
        admin = await User_1.default.create({
            name: adminName,
            email: adminEmail,
            passwordHash,
            role: "ca_firm_admin",
            caFirmId: firm._id,
            designation: adminDesignation,
            icaiMembershipNo: adminMembershipNo || undefined,
            mustChangePassword: !usingOwnPassword,
            createdBy: req.user.id,
        });
    }
    catch (err) {
        await CaFirm_1.default.findByIdAndDelete(firm._id);
        throw err;
    }
    // Best-effort — a mail server hiccup must never fail the onboarding that already
    // happened. The temp password is still shown on-screen (FirmCreatedNotice) as a fallback.
    try {
        const { subject, html } = (0, emailTemplates_1.credentialsWelcomeEmail)({
            platformName: settings.platformName,
            firmName: firm.name,
            recipientName: admin.name,
            email: admin.email,
            password: usingOwnPassword ? adminPassword : tempPassword,
            loginUrl: `${process.env.CLIENT_URL}/login`,
        });
        await (0, sendMail_1.sendMail)({ to: admin.email, subject, html });
    }
    catch (err) {
        console.error("Failed to send CA firm admin welcome email:", err.message);
    }
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: "ca_firm.created",
        targetType: "CaFirm",
        targetId: firm._id,
        targetLabel: firm.name,
        metadata: { tier, adminEmail },
    });
    await (0, createNotification_1.createNotification)({
        title: "Welcome to Praxis",
        message: `${firm.name} has been onboarded on the ${tier} plan.`,
        type: "system",
        scope: "firm",
        caFirmId: firm._id,
        createdBy: req.user.id,
    });
    res.status(201).json({
        success: true,
        data: {
            firm,
            admin: { id: admin._id, name: admin.name, email: admin.email, tempPassword },
        },
        message: usingOwnPassword
            ? "CA firm and admin account created. They can log in with the password you set."
            : "CA firm and admin account created. Share the temporary password with the admin securely.",
    });
});
exports.resetFirmAdminPassword = (0, catchAsync_1.default)(async (req, res) => {
    const { newPassword } = req.body;
    const admin = await User_1.default.findOne({ caFirmId: req.params.id, role: "ca_firm_admin" });
    if (!admin)
        throw new ApiError_1.default(404, "CA firm admin not found");
    const usingOwnPassword = !!newPassword;
    const tempPassword = usingOwnPassword ? null : (0, generatePassword_1.generateTempPassword)();
    admin.passwordHash = await bcryptjs_1.default.hash(usingOwnPassword ? newPassword : tempPassword, SALT_ROUNDS);
    admin.mustChangePassword = !usingOwnPassword;
    admin.tokenVersion += 1;
    await admin.save();
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: "ca_firm.admin_password_reset",
        targetType: "CaFirm",
        targetId: req.params.id,
        targetLabel: admin.name,
    });
    await (0, createNotification_1.createNotification)({
        title: "Admin password reset",
        message: "Your firm admin password was reset by the platform team.",
        type: "warning",
        scope: "firm",
        caFirmId: req.params.id,
        role: "ca_firm_admin",
        createdBy: req.user.id,
    });
    res.json({
        success: true,
        data: { admin: { id: admin._id, name: admin.name, email: admin.email }, tempPassword },
        message: usingOwnPassword
            ? "Admin password updated. They can log in with the password you set."
            : "Admin password reset. Share the temporary password with them securely.",
    });
});
exports.getCaFirm = (0, catchAsync_1.default)(async (req, res) => {
    const firm = await CaFirm_1.default.findById(req.params.id);
    if (!firm)
        throw new ApiError_1.default(404, "CA firm not found");
    res.json({ success: true, data: firm });
});
// Hard delete: also removes every user (admin/staff/business-client accounts) and
// business client record nested under this firm, since none of them can exist
// without their parent tenant.
exports.deleteCaFirm = (0, catchAsync_1.default)(async (req, res) => {
    const firm = await CaFirm_1.default.findById(req.params.id);
    if (!firm)
        throw new ApiError_1.default(404, "CA firm not found");
    await User_1.default.deleteMany({ caFirmId: firm._id });
    await BusinessClient_1.default.deleteMany({ caFirmId: firm._id });
    await firm.deleteOne();
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: "ca_firm.deleted",
        targetType: "CaFirm",
        targetId: firm._id,
        targetLabel: firm.name,
    });
    res.json({ success: true, message: "CA firm deleted" });
});
exports.updateCaFirm = (0, catchAsync_1.default)(async (req, res) => {
    const { name, email, phone, address, icaiRegistrationNumber, constitutionType, pan, gstin, isActive } = req.body;
    const update = {};
    if (name !== undefined)
        update.name = name;
    if (email !== undefined)
        update.email = email;
    if (phone !== undefined)
        update.phone = phone;
    if (address !== undefined)
        update.address = address;
    if (icaiRegistrationNumber !== undefined)
        update.icaiRegistrationNumber = icaiRegistrationNumber;
    if (constitutionType !== undefined)
        update.constitutionType = constitutionType;
    if (pan !== undefined)
        update.pan = pan;
    if (gstin !== undefined)
        update.gstin = gstin;
    if (isActive !== undefined)
        update.isActive = isActive;
    const firm = await CaFirm_1.default.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
    });
    if (!firm)
        throw new ApiError_1.default(404, "CA firm not found");
    if (isActive !== undefined) {
        await (0, writeAuditLog_1.writeAuditLog)(req, {
            action: isActive ? "ca_firm.activated" : "ca_firm.suspended",
            targetType: "CaFirm",
            targetId: firm._id,
            targetLabel: firm.name,
        });
        await (0, createNotification_1.createNotification)({
            title: isActive ? "Account reactivated" : "Account suspended",
            message: isActive
                ? "Your firm's access has been reactivated."
                : "Your firm's access has been suspended. Contact support for details.",
            type: "warning",
            scope: "firm",
            caFirmId: firm._id,
            createdBy: req.user.id,
        });
    }
    res.json({ success: true, data: firm, message: "CA firm updated" });
});
exports.updateSubscription = (0, catchAsync_1.default)(async (req, res) => {
    const { tier, status, billingCycle, expiryDate } = req.body;
    const update = {};
    if (tier !== undefined) {
        update["plan.tier"] = tier;
        update["plan.seatLimit"] = CaFirm_1.PLAN_LIMITS[tier].seatLimit;
        update["plan.businessClientLimit"] = CaFirm_1.PLAN_LIMITS[tier].businessClientLimit;
    }
    if (status !== undefined)
        update["plan.status"] = status;
    if (billingCycle !== undefined)
        update["plan.billingCycle"] = billingCycle;
    if (expiryDate !== undefined)
        update["plan.expiryDate"] = expiryDate;
    const firm = await CaFirm_1.default.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!firm)
        throw new ApiError_1.default(404, "CA firm not found");
    res.json({ success: true, data: firm, message: "Subscription updated" });
});
// Read-only plan/status check open to every role in a firm, so any
// teammate's dashboard can know if the trial/subscription has lapsed.
exports.getMyFirmPlan = (0, catchAsync_1.default)(async (req, res) => {
    if (!req.user.caFirmId)
        return res.json({ success: true, data: null });
    const firm = await CaFirm_1.default.findById(req.user.caFirmId).select("name plan isActive");
    if (!firm)
        return res.json({ success: true, data: null });
    res.json({ success: true, data: { firmName: firm.name, isActive: firm.isActive, plan: firm.plan } });
});
exports.getMyFirm = (0, catchAsync_1.default)(async (req, res) => {
    const firm = await CaFirm_1.default.findById(req.user.caFirmId);
    if (!firm)
        throw new ApiError_1.default(404, "CA firm not found");
    res.json({ success: true, data: firm });
});
exports.updateMyFirm = (0, catchAsync_1.default)(async (req, res) => {
    const { name, email, phone, address, icaiRegistrationNumber, constitutionType, pan, gstin } = req.body;
    const update = {};
    if (name !== undefined)
        update.name = name;
    if (email !== undefined)
        update.email = email;
    if (phone !== undefined)
        update.phone = phone;
    if (address !== undefined)
        update.address = address;
    if (icaiRegistrationNumber !== undefined)
        update.icaiRegistrationNumber = icaiRegistrationNumber;
    if (constitutionType !== undefined)
        update.constitutionType = constitutionType;
    if (pan !== undefined)
        update.pan = pan;
    if (gstin !== undefined)
        update.gstin = gstin;
    const firm = await CaFirm_1.default.findByIdAndUpdate(req.user.caFirmId, update, {
        new: true,
        runValidators: true,
    });
    if (!firm)
        throw new ApiError_1.default(404, "CA firm not found");
    res.json({ success: true, data: firm, message: "Firm settings updated" });
});
// Tier catalog for the Subscription page — limits from PLAN_LIMITS merged with the
// Super Admin's configured pricing (Multi-Tenancy doc, Section 5). Enterprise has no
// fixed price; it's negotiated directly, per the same doc.
exports.getPlanCatalog = (0, catchAsync_1.default)(async (req, res) => {
    const settings = await (0, getSystemSettings_1.getSystemSettings)();
    res.json({
        success: true,
        data: {
            currency: settings.currency,
            tiers: {
                starter: { ...CaFirm_1.PLAN_LIMITS.starter, price: settings.starterPrice },
                growth: { ...CaFirm_1.PLAN_LIMITS.growth, price: settings.growthPrice },
                enterprise: { ...CaFirm_1.PLAN_LIMITS.enterprise, price: null },
            },
        },
    });
});
// No automated payment gateway in v1 (Module Scope doc, Section 6.2) — this just
// raises the request to Super Admin, who confirms and activates it manually via
// updateSubscription. Deliberately excluded from requireActiveFirm: renewing is the
// one thing a suspended/expired firm must still be able to do.
exports.requestSubscriptionChange = (0, catchAsync_1.default)(async (req, res) => {
    const { tier, billingCycle } = req.body;
    const firm = await CaFirm_1.default.findById(req.user.caFirmId);
    if (!firm)
        throw new ApiError_1.default(404, "CA firm not found");
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: "ca_firm.subscription_requested",
        targetType: "CaFirm",
        targetId: firm._id,
        targetLabel: firm.name,
        metadata: { tier, billingCycle },
    });
    await (0, createNotification_1.createNotification)({
        title: "Subscription request",
        message: `${firm.name} requested the ${tier} plan (${billingCycle === "annual" ? "annual" : "monthly"} billing).`,
        type: "info",
        scope: "super_admin",
        createdBy: req.user.id,
    });
    res.json({
        success: true,
        message: "Request sent. The platform team will confirm and activate your new plan shortly.",
    });
});
