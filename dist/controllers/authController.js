"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.changePassword = exports.getMe = exports.logout = exports.refresh = exports.login = exports.registerFirm = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const CaFirm_1 = __importDefault(require("../models/CaFirm"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const slugify_1 = require("../utils/slugify");
const sanitizeUser_1 = require("../utils/sanitizeUser");
const getSystemSettings_1 = require("../utils/getSystemSettings");
const createNotification_1 = require("../utils/createNotification");
const CaFirm_2 = require("../models/CaFirm");
const provisionHrms_1 = require("../utils/provisionHrms");
const generateToken_1 = require("../utils/generateToken");
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
async function issueSession(res, user) {
    const accessToken = (0, generateToken_1.signAccessToken)(user);
    const refreshToken = (0, generateToken_1.signRefreshToken)(user);
    (0, generateToken_1.setRefreshCookie)(res, refreshToken);
    return accessToken;
}
// Self-serve trial signup: a CA firm registers itself and becomes the
// ca_firm_admin. Super Admin can also onboard firms manually (see
// caFirmController.createCaFirm) — both paths create the same shape of firm.
exports.registerFirm = (0, catchAsync_1.default)(async (req, res) => {
    const { firmName, adminName, adminEmail, password, phone } = req.body;
    const existing = await User_1.default.findOne({ email: adminEmail });
    if (existing)
        throw new ApiError_1.default(409, "An account with this email already exists");
    const settings = await (0, getSystemSettings_1.getSystemSettings)();
    const trialDays = settings.defaultTrialDays;
    const slug = await (0, slugify_1.generateUniqueSlug)(firmName);
    const limits = CaFirm_2.PLAN_LIMITS.starter;
    const firm = await CaFirm_1.default.create({
        name: firmName,
        slug,
        email: adminEmail,
        phone,
        plan: {
            tier: "starter",
            status: "trial",
            seatLimit: limits.seatLimit,
            businessClientLimit: limits.businessClientLimit,
            startDate: new Date(),
            expiryDate: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
        },
        createdBy: null,
    });
    let user;
    try {
        const passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
        user = await User_1.default.create({
            name: adminName,
            email: adminEmail,
            passwordHash,
            role: "ca_firm_admin",
            caFirmId: firm._id,
            phone,
            createdBy: null,
        });
    }
    catch (err) {
        await CaFirm_1.default.findByIdAndDelete(firm._id);
        throw err;
    }
    await (0, createNotification_1.createNotification)({
        title: "New CA firm registered",
        message: `${firm.name} signed up for a free trial.`,
        type: "system",
        scope: "super_admin",
    });
    const accessToken = await issueSession(res, user);
    res.status(201).json({
        success: true,
        data: { accessToken, user: (0, sanitizeUser_1.sanitizeUser)(user), firm },
        message: "Firm registered successfully",
    });
});
exports.login = (0, catchAsync_1.default)(async (req, res) => {
    const { email, password } = req.body;
    const user = await User_1.default.findOne({ email }).select("+passwordHash");
    if (!user) {
        // Not a CA-Management account — could be an employee (Manager, Finance,
        // IT Admin, ...) an HR Admin created directly inside a Business Client's
        // HRMS, who has no account here at all. Check there before rejecting.
        const hrmsResult = await (0, provisionHrms_1.verifyHrmsLogin)(email, password);
        if (hrmsResult.valid) {
            return res.json({ success: true, data: { hrmsRedirect: true, hrmsToken: hrmsResult.token } });
        }
        throw new ApiError_1.default(401, "Invalid email or password");
    }
    const match = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!match)
        throw new ApiError_1.default(401, "Invalid email or password");
    if (!user.isActive)
        throw new ApiError_1.default(403, "Your account has been disabled");
    user.lastLoginAt = new Date();
    await user.save();
    const accessToken = await issueSession(res, user);
    res.json({ success: true, data: { accessToken, user: (0, sanitizeUser_1.sanitizeUser)(user) } });
});
exports.refresh = (0, catchAsync_1.default)(async (req, res) => {
    const token = (0, generateToken_1.getRefreshCookie)(req);
    if (!token)
        throw new ApiError_1.default(401, "Not authenticated");
    let payload;
    try {
        payload = (0, generateToken_1.verifyRefreshToken)(token);
    }
    catch {
        (0, generateToken_1.clearRefreshCookie)(res);
        throw new ApiError_1.default(401, "Session expired, please log in again");
    }
    const user = await User_1.default.findById(payload.sub);
    if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
        (0, generateToken_1.clearRefreshCookie)(res);
        throw new ApiError_1.default(401, "Session expired, please log in again");
    }
    const accessToken = await issueSession(res, user);
    res.json({ success: true, data: { accessToken, user: (0, sanitizeUser_1.sanitizeUser)(user) } });
});
exports.logout = (0, catchAsync_1.default)(async (req, res) => {
    (0, generateToken_1.clearRefreshCookie)(res);
    res.json({ success: true, message: "Logged out" });
});
exports.getMe = (0, catchAsync_1.default)(async (req, res) => {
    res.json({ success: true, data: { user: (0, sanitizeUser_1.sanitizeUser)(req.currentUser) } });
});
exports.changePassword = (0, catchAsync_1.default)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User_1.default.findById(req.user.id).select("+passwordHash");
    const match = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!match)
        throw new ApiError_1.default(401, "Current password is incorrect");
    user.passwordHash = await bcryptjs_1.default.hash(newPassword, SALT_ROUNDS);
    user.tokenVersion += 1;
    user.mustChangePassword = false;
    await user.save();
    const accessToken = await issueSession(res, user);
    res.json({ success: true, data: { accessToken, user: (0, sanitizeUser_1.sanitizeUser)(user) }, message: "Password updated" });
});
exports.updateProfile = (0, catchAsync_1.default)(async (req, res) => {
    const { name, phone, email, currentPassword } = req.body;
    const user = await User_1.default.findById(req.user.id).select("+passwordHash");
    if (email && email !== user.email) {
        const match = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!match)
            throw new ApiError_1.default(401, "Current password is incorrect");
        const emailTaken = await User_1.default.exists({ email, _id: { $ne: user._id } });
        if (emailTaken)
            throw new ApiError_1.default(409, "Email already in use");
        user.email = email;
    }
    if (name)
        user.name = name;
    if (phone !== undefined)
        user.phone = phone;
    await user.save();
    res.json({ success: true, data: { user: (0, sanitizeUser_1.sanitizeUser)(user) }, message: "Profile updated" });
});
