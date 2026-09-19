import bcrypt from "bcryptjs";
import User from "../models/User";
import CaFirm from "../models/CaFirm";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { generateUniqueSlug } from "../utils/slugify";
import { sanitizeUser } from "../utils/sanitizeUser";
import { getSystemSettings } from "../utils/getSystemSettings";
import { createNotification } from "../utils/createNotification";
import { PLAN_LIMITS } from "../models/CaFirm";
import { verifyHrmsLogin } from "../utils/provisionHrms";
import {
  signAccessToken,
  signRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  verifyRefreshToken,
  getRefreshCookie,
} from "../utils/generateToken";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  setRefreshCookie(res, refreshToken);
  return accessToken;
}

// Self-serve trial signup: a CA firm registers itself and becomes the
// ca_firm_admin. Super Admin can also onboard firms manually (see
// caFirmController.createCaFirm) — both paths create the same shape of firm.
export const registerFirm = catchAsync(async (req, res) => {
  const { firmName, adminName, adminEmail, password, phone } = req.body;

  const existing = await User.findOne({ email: adminEmail });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const settings = await getSystemSettings();
  const trialDays = settings.defaultTrialDays;
  const slug = await generateUniqueSlug(firmName);
  const limits = PLAN_LIMITS.starter;

  const firm = await CaFirm.create({
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
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    user = await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "ca_firm_admin",
      caFirmId: firm._id,
      phone,
      createdBy: null,
    });
  } catch (err) {
    await CaFirm.findByIdAndDelete(firm._id);
    throw err;
  }

  await createNotification({
    title: "New CA firm registered",
    message: `${firm.name} signed up for a free trial.`,
    type: "system",
    scope: "super_admin",
  });

  const accessToken = await issueSession(res, user);
  res.status(201).json({
    success: true,
    data: { accessToken, user: sanitizeUser(user), firm },
    message: "Firm registered successfully",
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) {
    // Not a CA-Management account — could be an employee (Manager, Finance,
    // IT Admin, ...) an HR Admin created directly inside a Business Client's
    // HRMS, who has no account here at all. Check there before rejecting.
    const hrmsResult = await verifyHrmsLogin(email, password);
    if (hrmsResult.valid) {
      return res.json({ success: true, data: { hrmsRedirect: true, hrmsToken: hrmsResult.token } });
    }
    throw new ApiError(401, "Invalid email or password");
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new ApiError(401, "Invalid email or password");

  if (!user.isActive) throw new ApiError(403, "Your account has been disabled");

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = await issueSession(res, user);
  res.json({ success: true, data: { accessToken, user: sanitizeUser(user) } });
});

export const refresh = catchAsync(async (req, res) => {
  const token = getRefreshCookie(req);
  if (!token) throw new ApiError(401, "Not authenticated");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearRefreshCookie(res);
    throw new ApiError(401, "Session expired, please log in again");
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
    clearRefreshCookie(res);
    throw new ApiError(401, "Session expired, please log in again");
  }

  const accessToken = await issueSession(res, user);
  res.json({ success: true, data: { accessToken, user: sanitizeUser(user) } });
});

export const logout = catchAsync(async (req, res) => {
  clearRefreshCookie(res);
  res.json({ success: true, message: "Logged out" });
});

export const getMe = catchAsync(async (req, res) => {
  res.json({ success: true, data: { user: sanitizeUser(req.currentUser) } });
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select("+passwordHash");
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new ApiError(401, "Current password is incorrect");

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.tokenVersion += 1;
  user.mustChangePassword = false;
  await user.save();

  const accessToken = await issueSession(res, user);
  res.json({ success: true, data: { accessToken, user: sanitizeUser(user) }, message: "Password updated" });
});

export const updateProfile = catchAsync(async (req, res) => {
  const { name, phone, email, currentPassword } = req.body;
  const user = await User.findById(req.user.id).select("+passwordHash");

  if (email && email !== user.email) {
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw new ApiError(401, "Current password is incorrect");
    const emailTaken = await User.exists({ email, _id: { $ne: user._id } });
    if (emailTaken) throw new ApiError(409, "Email already in use");
    user.email = email;
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;

  await user.save();
  res.json({ success: true, data: { user: sanitizeUser(user) }, message: "Profile updated" });
});
