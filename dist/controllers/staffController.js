"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetStaffPassword = exports.updateStaff = exports.createStaff = exports.listStaff = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const CaFirm_1 = __importDefault(require("../models/CaFirm"));
const User_1 = __importDefault(require("../models/User"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const paginate_1 = require("../utils/paginate");
const generatePassword_1 = require("../utils/generatePassword");
const sanitizeUser_1 = require("../utils/sanitizeUser");
const writeAuditLog_1 = require("../utils/writeAuditLog");
const getSystemSettings_1 = require("../utils/getSystemSettings");
const sendMail_1 = require("../utils/sendMail");
const emailTemplates_1 = require("../utils/emailTemplates");
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
exports.listStaff = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, skip } = (0, paginate_1.getPagination)(req.query);
    const filter = { caFirmId: req.user.caFirmId, role: "ca_firm_staff" };
    if (req.query.search) {
        filter.$or = [
            { name: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
        ];
    }
    const [staff, total] = await Promise.all([
        User_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        User_1.default.countDocuments(filter),
    ]);
    const firm = await CaFirm_1.default.findById(req.user.caFirmId).select("plan.seatLimit");
    const seatCount = await User_1.default.countDocuments({
        caFirmId: req.user.caFirmId,
        role: { $in: ["ca_firm_admin", "ca_firm_staff"] },
    });
    res.json({
        success: true,
        data: staff.map(sanitizeUser_1.sanitizeUser),
        meta: (0, paginate_1.buildMeta)({ page, limit, total }),
        seats: { used: seatCount, limit: firm.plan.seatLimit },
    });
});
// Per Multi-Tenancy doc Section 5: "Staff Seats" caps every Tier-2 login on the firm
// (admin + staff), not staff alone.
exports.createStaff = (0, catchAsync_1.default)(async (req, res) => {
    const { name, email, phone, designation, icaiMembershipNo, password } = req.body;
    const existing = await User_1.default.findOne({ email });
    if (existing)
        throw new ApiError_1.default(409, "An account with this email already exists");
    const firm = await CaFirm_1.default.findById(req.user.caFirmId);
    if (firm.plan.seatLimit !== null) {
        const seatCount = await User_1.default.countDocuments({
            caFirmId: firm._id,
            role: { $in: ["ca_firm_admin", "ca_firm_staff"] },
        });
        if (seatCount >= firm.plan.seatLimit) {
            throw new ApiError_1.default(403, `Seat limit reached for the ${firm.plan.tier} plan. Upgrade to add more staff.`);
        }
    }
    const usingOwnPassword = !!password;
    const tempPassword = usingOwnPassword ? null : (0, generatePassword_1.generateTempPassword)();
    const passwordHash = await bcryptjs_1.default.hash(usingOwnPassword ? password : tempPassword, SALT_ROUNDS);
    const staff = await User_1.default.create({
        name,
        email,
        passwordHash,
        role: "ca_firm_staff",
        caFirmId: firm._id,
        phone,
        designation: designation || undefined,
        icaiMembershipNo: icaiMembershipNo || undefined,
        mustChangePassword: !usingOwnPassword,
        createdBy: req.user.id,
    });
    try {
        const settings = await (0, getSystemSettings_1.getSystemSettings)();
        const { subject, html } = (0, emailTemplates_1.credentialsWelcomeEmail)({
            platformName: settings.platformName,
            firmName: firm.name,
            recipientName: staff.name,
            email: staff.email,
            password: usingOwnPassword ? password : tempPassword,
            loginUrl: `${process.env.CLIENT_URL}/login`,
        });
        await (0, sendMail_1.sendMail)({ to: staff.email, subject, html });
    }
    catch (err) {
        console.error("Failed to send staff welcome email:", err.message);
    }
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: "staff.created",
        targetType: "User",
        targetId: staff._id,
        targetLabel: staff.name,
    });
    res.status(201).json({
        success: true,
        data: { staff: (0, sanitizeUser_1.sanitizeUser)(staff), tempPassword },
        message: usingOwnPassword
            ? "Staff account created. They can log in with the password you set."
            : "Staff account created. Login credentials have been emailed to them.",
    });
});
exports.updateStaff = (0, catchAsync_1.default)(async (req, res) => {
    const { name, email, phone, designation, icaiMembershipNo, isActive } = req.body;
    const staff = await User_1.default.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId, role: "ca_firm_staff" });
    if (!staff)
        throw new ApiError_1.default(404, "Staff member not found");
    if (name !== undefined)
        staff.name = name;
    if (email !== undefined)
        staff.email = email;
    if (phone !== undefined)
        staff.phone = phone;
    if (designation !== undefined)
        staff.designation = designation;
    if (icaiMembershipNo !== undefined)
        staff.icaiMembershipNo = icaiMembershipNo;
    if (isActive !== undefined) {
        staff.isActive = isActive;
        if (!isActive)
            staff.tokenVersion += 1;
    }
    await staff.save();
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: isActive === undefined ? "staff.updated" : isActive ? "staff.activated" : "staff.deactivated",
        targetType: "User",
        targetId: staff._id,
        targetLabel: staff.name,
    });
    res.json({ success: true, data: (0, sanitizeUser_1.sanitizeUser)(staff), message: "Staff member updated" });
});
exports.resetStaffPassword = (0, catchAsync_1.default)(async (req, res) => {
    const { newPassword } = req.body;
    const staff = await User_1.default.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId, role: "ca_firm_staff" });
    if (!staff)
        throw new ApiError_1.default(404, "Staff member not found");
    const usingOwnPassword = !!newPassword;
    const tempPassword = usingOwnPassword ? null : (0, generatePassword_1.generateTempPassword)();
    staff.passwordHash = await bcryptjs_1.default.hash(usingOwnPassword ? newPassword : tempPassword, SALT_ROUNDS);
    staff.mustChangePassword = !usingOwnPassword;
    staff.tokenVersion += 1;
    await staff.save();
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: "staff.password_reset",
        targetType: "User",
        targetId: staff._id,
        targetLabel: staff.name,
    });
    res.json({
        success: true,
        data: { tempPassword },
        message: usingOwnPassword ? "Password updated." : "Password reset. Share the temporary password securely.",
    });
});
