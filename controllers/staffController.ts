import bcrypt from "bcryptjs";
import { notifyAccountCreated } from "../utils/notificationEvents";
import CaFirm from "../models/CaFirm";
import User from "../models/User";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { getPagination, buildMeta } from "../utils/paginate";
import { generateTempPassword } from "../utils/generatePassword";
import { sanitizeUser } from "../utils/sanitizeUser";
import { writeAuditLog } from "../utils/writeAuditLog";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

export const listStaff = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { caFirmId: req.user.caFirmId, role: "ca_firm_staff" };
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const [staff, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  const firm = await CaFirm.findById(req.user.caFirmId).select("plan.seatLimit");
  const seatCount = await User.countDocuments({
    caFirmId: req.user.caFirmId,
    role: { $in: ["ca_firm_admin", "ca_firm_staff"] },
  });

  res.json({
    success: true,
    data: staff.map(sanitizeUser),
    meta: buildMeta({ page, limit, total }),
    seats: { used: seatCount, limit: firm.plan.seatLimit },
  });
});

// Per Multi-Tenancy doc Section 5: "Staff Seats" caps every Tier-2 login on the firm
// (admin + staff), not staff alone.
export const createStaff = catchAsync(async (req, res) => {
  const { name, email, phone, designation, icaiMembershipNo, password, permissions } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const firm = await CaFirm.findById(req.user.caFirmId);
  if (firm.plan.seatLimit !== null) {
    const seatCount = await User.countDocuments({
      caFirmId: firm._id,
      role: { $in: ["ca_firm_admin", "ca_firm_staff"] },
    });
    if (seatCount >= firm.plan.seatLimit) {
      throw new ApiError(403, `Seat limit reached for the ${firm.plan.tier} plan. Upgrade to add more staff.`);
    }
  }

  const usingOwnPassword = !!password;
  const tempPassword = usingOwnPassword ? null : generateTempPassword(name);
  const passwordHash = await bcrypt.hash(usingOwnPassword ? password : tempPassword, SALT_ROUNDS);

  const staff = await User.create({
    name,
    email,
    passwordHash,
    role: "ca_firm_staff",
    caFirmId: firm._id,
    phone,
    designation: designation || undefined,
    icaiMembershipNo: icaiMembershipNo || undefined,
    mustChangePassword: !usingOwnPassword,
    permissions: permissions || undefined,
    createdBy: req.user.id,
  });

  // New user → login credentials by email + WhatsApp heads-up (no password).
  notifyAccountCreated({
    caFirmId: firm._id,
    organisationName: firm.name,
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    password: usingOwnPassword ? password : tempPassword,
  });

  await writeAuditLog(req, {
    action: "staff.created",
    targetType: "User",
    targetId: staff._id,
    targetLabel: staff.name,
  });

  res.status(201).json({
    success: true,
    data: { staff: sanitizeUser(staff), tempPassword },
    message: usingOwnPassword
      ? "Staff account created. They can log in with the password you set."
      : "Staff account created. Login credentials have been emailed to them.",
  });
});

export const updateStaff = catchAsync(async (req, res) => {
  const { name, email, phone, designation, icaiMembershipNo, isActive, permissions } = req.body;
  const staff = await User.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId, role: "ca_firm_staff" });
  if (!staff) throw new ApiError(404, "Staff member not found");

  if (name !== undefined) staff.name = name;
  if (email !== undefined) staff.email = email;
  if (phone !== undefined) staff.phone = phone;
  if (designation !== undefined) staff.designation = designation;
  if (icaiMembershipNo !== undefined) staff.icaiMembershipNo = icaiMembershipNo;
  if (isActive !== undefined) {
    staff.isActive = isActive;
    if (!isActive) staff.tokenVersion += 1;
  }
  if (permissions !== undefined) {
    for (const moduleName of Object.keys(permissions)) {
      staff.permissions[moduleName] = { ...staff.permissions[moduleName], ...permissions[moduleName] };
    }
  }
  await staff.save();

  await writeAuditLog(req, {
    action: isActive === undefined ? "staff.updated" : isActive ? "staff.activated" : "staff.deactivated",
    targetType: "User",
    targetId: staff._id,
    targetLabel: staff.name,
  });

  res.json({ success: true, data: sanitizeUser(staff), message: "Staff member updated" });
});

export const resetStaffPassword = catchAsync(async (req, res) => {
  const { newPassword } = req.body;
  const staff = await User.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId, role: "ca_firm_staff" });
  if (!staff) throw new ApiError(404, "Staff member not found");

  const usingOwnPassword = !!newPassword;
  const tempPassword = usingOwnPassword ? null : generateTempPassword(staff.name);
  staff.passwordHash = await bcrypt.hash(usingOwnPassword ? newPassword : tempPassword, SALT_ROUNDS);
  staff.mustChangePassword = !usingOwnPassword;
  staff.tokenVersion += 1;
  await staff.save();

  await writeAuditLog(req, {
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

export const deleteStaff = catchAsync(async (req, res) => {
  const staff = await User.findOneAndDelete({
    _id: req.params.id,
    caFirmId: req.user.caFirmId,
    role: "ca_firm_staff",
  });
  if (!staff) throw new ApiError(404, "Staff member not found");

  await writeAuditLog(req, {
    action: "staff.deleted",
    targetType: "User",
    targetId: staff._id,
    targetLabel: staff.name,
  });

  res.json({ success: true, message: "Staff member deleted" });
});
