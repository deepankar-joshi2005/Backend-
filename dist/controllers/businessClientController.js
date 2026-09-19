"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetBusinessClientAdminPassword = exports.updateMyBusinessClient = exports.getMyHrmsSsoToken = exports.getMyBusinessClient = exports.createBusinessClient = exports.listMyBusinessClients = exports.getBusinessClientSummary = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const CaFirm_1 = __importDefault(require("../models/CaFirm"));
const User_1 = __importDefault(require("../models/User"));
const BusinessClient_1 = __importDefault(require("../models/BusinessClient"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const paginate_1 = require("../utils/paginate");
const generatePassword_1 = require("../utils/generatePassword");
const writeAuditLog_1 = require("../utils/writeAuditLog");
const getSystemSettings_1 = require("../utils/getSystemSettings");
const sendMail_1 = require("../utils/sendMail");
const emailTemplates_1 = require("../utils/emailTemplates");
const provisionHrms_1 = require("../utils/provisionHrms");
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
// Aggregate-only — Super Admin sees counts, never an individual business
// client's own data (Role Matrix: "Super Admin has no default access to any
// tenant's operational data"). Full detail lives in the CA Firm Admin's own
// HRMS module once that's built.
exports.getBusinessClientSummary = (0, catchAsync_1.default)(async (req, res) => {
    const [total, active, suspended, byFirm] = await Promise.all([
        BusinessClient_1.default.countDocuments(),
        BusinessClient_1.default.countDocuments({ isActive: true }),
        BusinessClient_1.default.countDocuments({ isActive: false }),
        BusinessClient_1.default.aggregate([
            { $group: { _id: "$caFirmId", count: { $sum: 1 } } },
            { $lookup: { from: "cafirms", localField: "_id", foreignField: "_id", as: "firm" } },
            { $unwind: "$firm" },
            { $project: { _id: 0, caFirmId: "$_id", firmName: "$firm.name", count: 1 } },
            { $sort: { count: -1 } },
        ]),
    ]);
    res.json({ success: true, data: { total, active, suspended, byFirm } });
});
// Everything below is the CA Firm Admin's own view — scoped to their firm only.
exports.listMyBusinessClients = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, skip } = (0, paginate_1.getPagination)(req.query);
    const filter = { caFirmId: req.user.caFirmId };
    if (req.query.search)
        filter.name = { $regex: req.query.search, $options: "i" };
    const [clients, total, firm] = await Promise.all([
        BusinessClient_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        BusinessClient_1.default.countDocuments(filter),
        CaFirm_1.default.findById(req.user.caFirmId).select("plan.businessClientLimit"),
    ]);
    const usedCount = await BusinessClient_1.default.countDocuments({ caFirmId: req.user.caFirmId });
    res.json({
        success: true,
        data: clients,
        meta: (0, paginate_1.buildMeta)({ page, limit, total }),
        limit: { used: usedCount, max: firm.plan.businessClientLimit },
    });
});
// Per Multi-Tenancy doc Section 4.2: CA Firm Admin onboards the business client and
// its admin gets their own login, invited by email with credentials.
exports.createBusinessClient = (0, catchAsync_1.default)(async (req, res) => {
    const { name, email, phone, adminName, adminEmail, adminPassword } = req.body;
    const existingAdmin = await User_1.default.findOne({ email: adminEmail });
    if (existingAdmin)
        throw new ApiError_1.default(409, "An account with this admin email already exists");
    const firm = await CaFirm_1.default.findById(req.user.caFirmId);
    if (firm.plan.businessClientLimit !== null) {
        const usedCount = await BusinessClient_1.default.countDocuments({ caFirmId: firm._id });
        if (usedCount >= firm.plan.businessClientLimit) {
            throw new ApiError_1.default(403, `Business client limit reached for the ${firm.plan.tier} plan. Upgrade to add more.`);
        }
    }
    const client = await BusinessClient_1.default.create({
        name,
        email,
        phone,
        caFirmId: firm._id,
        createdBy: req.user.id,
    });
    const usingOwnPassword = !!adminPassword;
    const tempPassword = usingOwnPassword ? null : (0, generatePassword_1.generateTempPassword)();
    const passwordHash = await bcryptjs_1.default.hash(usingOwnPassword ? adminPassword : tempPassword, SALT_ROUNDS);
    let admin;
    try {
        admin = await User_1.default.create({
            name: adminName,
            email: adminEmail,
            passwordHash,
            role: "business_client_admin",
            caFirmId: firm._id,
            businessClientId: client._id,
            mustChangePassword: !usingOwnPassword,
            createdBy: req.user.id,
        });
    }
    catch (err) {
        await BusinessClient_1.default.findByIdAndDelete(client._id);
        throw err;
    }
    // Best-effort — the same bcrypt hash is handed to HRMS so the admin's password
    // works unchanged on both systems; if HRMS is unreachable, the business client
    // still exists on the CA-Management side and this can be retried later.
    try {
        const provisioned = await (0, provisionHrms_1.provisionHrmsCompany)({
            companyName: client.name,
            adminName,
            adminEmail,
            adminPasswordHash: passwordHash,
            adminPhone: phone,
            caFirmId: firm._id.toString(),
            caFirmName: firm.name,
        });
        if (provisioned) {
            client.hrmsCompanyId = provisioned.hrmsCompanyId;
            client.hrmsCompanyCode = provisioned.hrmsCompanyCode;
            await client.save();
        }
    }
    catch (err) {
        console.error("Failed to provision HRMS company:", err.message);
    }
    try {
        const settings = await (0, getSystemSettings_1.getSystemSettings)();
        const { subject, html } = (0, emailTemplates_1.credentialsWelcomeEmail)({
            platformName: settings.platformName,
            firmName: client.name,
            recipientName: admin.name,
            email: admin.email,
            password: usingOwnPassword ? adminPassword : tempPassword,
            loginUrl: `${process.env.CLIENT_URL}/login`,
        });
        await (0, sendMail_1.sendMail)({ to: admin.email, subject, html });
    }
    catch (err) {
        console.error("Failed to send business client admin welcome email:", err.message);
    }
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: "business_client.created",
        targetType: "BusinessClient",
        targetId: client._id,
        targetLabel: client.name,
    });
    res.status(201).json({
        success: true,
        data: { client, admin: { id: admin._id, name: admin.name, email: admin.email, tempPassword } },
        message: usingOwnPassword
            ? "Business client onboarded. Their admin can log in with the password you set."
            : "Business client onboarded. Login credentials have been emailed to their admin.",
    });
});
// The business client's own view of itself — used by its Admin/Employee to know
// whether their HRMS is provisioned yet and get their firm's display name.
exports.getMyBusinessClient = (0, catchAsync_1.default)(async (req, res) => {
    if (!req.user.businessClientId)
        return res.json({ success: true, data: null });
    const client = await BusinessClient_1.default.findById(req.user.businessClientId).select("name hrmsCompanyId isActive");
    if (!client)
        return res.json({ success: true, data: null });
    res.json({ success: true, data: client });
});
// Powers the "log in once, land in HRMS" flow — CA-Management has already
// verified this user's password, so it trades their (verified) email for a real
// HRMS session token instead of asking them to log in a second time.
exports.getMyHrmsSsoToken = (0, catchAsync_1.default)(async (req, res) => {
    if (!req.user.businessClientId)
        throw new ApiError_1.default(404, "No business client linked to this account");
    const client = await BusinessClient_1.default.findById(req.user.businessClientId).select("hrmsCompanyId");
    if (!(client === null || client === void 0 ? void 0 : client.hrmsCompanyId))
        throw new ApiError_1.default(404, "HRMS is not set up for this account yet");
    const token = await (0, provisionHrms_1.getHrmsSsoToken)(req.currentUser.email);
    res.json({ success: true, data: { token } });
});
exports.updateMyBusinessClient = (0, catchAsync_1.default)(async (req, res) => {
    const { name, email, phone, isActive } = req.body;
    const client = await BusinessClient_1.default.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId });
    if (!client)
        throw new ApiError_1.default(404, "Business client not found");
    if (name !== undefined)
        client.name = name;
    if (email !== undefined)
        client.email = email;
    if (phone !== undefined)
        client.phone = phone;
    if (isActive !== undefined)
        client.isActive = isActive;
    await client.save();
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: isActive === undefined ? "business_client.updated" : isActive ? "business_client.activated" : "business_client.suspended",
        targetType: "BusinessClient",
        targetId: client._id,
        targetLabel: client.name,
    });
    res.json({ success: true, data: client, message: "Business client updated" });
});
exports.resetBusinessClientAdminPassword = (0, catchAsync_1.default)(async (req, res) => {
    const { newPassword } = req.body;
    const client = await BusinessClient_1.default.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId });
    if (!client)
        throw new ApiError_1.default(404, "Business client not found");
    const admin = await User_1.default.findOne({ businessClientId: client._id, role: "business_client_admin" });
    if (!admin)
        throw new ApiError_1.default(404, "Business client admin not found");
    const usingOwnPassword = !!newPassword;
    const tempPassword = usingOwnPassword ? null : (0, generatePassword_1.generateTempPassword)();
    admin.passwordHash = await bcryptjs_1.default.hash(usingOwnPassword ? newPassword : tempPassword, SALT_ROUNDS);
    admin.mustChangePassword = !usingOwnPassword;
    admin.tokenVersion += 1;
    await admin.save();
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: "business_client.admin_password_reset",
        targetType: "BusinessClient",
        targetId: client._id,
        targetLabel: client.name,
    });
    res.json({
        success: true,
        data: { tempPassword },
        message: usingOwnPassword ? "Password updated." : "Password reset. Share the temporary password securely.",
    });
});
