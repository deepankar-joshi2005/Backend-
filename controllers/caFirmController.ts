import bcrypt from "bcryptjs";
import crypto from "crypto";
import Razorpay from "razorpay";
import CaFirm, { PLAN_LIMITS } from "../models/CaFirm";
import CaFirmPayment from "../models/CaFirmPayment";
import User from "../models/User";
import BusinessClient from "../models/BusinessClient";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { generateUniqueSlug } from "../utils/slugify";
import { generateTempPassword } from "../utils/generatePassword";
import { getPagination, buildMeta } from "../utils/paginate";
import { getSystemSettings } from "../utils/getSystemSettings";
import { writeAuditLog } from "../utils/writeAuditLog";
import { createNotification } from "../utils/createNotification";
import { sendMail } from "../utils/sendMail";
import { credentialsWelcomeEmail } from "../utils/emailTemplates";
import { getGraceInfo } from "../utils/licenceGrace";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

// Same Razorpay account/keys already used by HRMS billing (hrms/controllers/saasController.ts) —
// one Razorpay account for the whole platform, just a different product/tenant per flow.
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const listCaFirms = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
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
    CaFirm.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CaFirm.countDocuments(filter),
  ]);

  res.json({ success: true, data: firms, meta: buildMeta({ page, limit, total }) });
});

// Super Admin onboarding flow (see Super Admin flowchart, Part 1-2): create
// the firm tenant record, auto-generate CA Firm Admin credentials.
export const createCaFirm = catchAsync(async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    icaiRegistrationNumber,
    constitutionType,
    pan,
    gstin,
    planTier,
    billingCycle,
    adminName,
    adminEmail,
    adminPassword,
    adminDesignation,
    adminMembershipNo,
  } = req.body;

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) throw new ApiError(409, "An account with this admin email already exists");

  if (icaiRegistrationNumber) {
    const existingFirm = await CaFirm.findOne({ icaiRegistrationNumber });
    if (existingFirm) throw new ApiError(409, "A CA firm with this ICAI registration number already exists");
  }

  const settings = await getSystemSettings();
  const trialDays = settings.defaultTrialDays;
  const slug = await generateUniqueSlug(name);
  const tier = planTier || "starter";
  const cycle = billingCycle || "monthly";
  const limits = PLAN_LIMITS[tier];

  const firm = await CaFirm.create({
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
  const tempPassword = usingOwnPassword ? null : generateTempPassword();
  let admin;
  try {
    const passwordHash = await bcrypt.hash(usingOwnPassword ? adminPassword : tempPassword, SALT_ROUNDS);
    admin = await User.create({
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
  } catch (err) {
    await CaFirm.findByIdAndDelete(firm._id);
    throw err;
  }

  // Best-effort — a mail server hiccup must never fail the onboarding that already
  // happened. The temp password is still shown on-screen (FirmCreatedNotice) as a fallback.
  try {
    const { subject, html } = credentialsWelcomeEmail({
      platformName: settings.platformName,
      firmName: firm.name,
      recipientName: admin.name,
      email: admin.email,
      password: usingOwnPassword ? adminPassword : tempPassword,
      loginUrl: `${process.env.CLIENT_URL}/login`,
    });
    await sendMail({ to: admin.email, subject, html });
  } catch (err) {
    console.error("Failed to send CA firm admin welcome email:", err.message);
  }

  await writeAuditLog(req, {
    action: "ca_firm.created",
    targetType: "CaFirm",
    targetId: firm._id,
    targetLabel: firm.name,
    metadata: { tier, adminEmail },
  });

  await createNotification({
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

export const resetFirmAdminPassword = catchAsync(async (req, res) => {
  const { newPassword } = req.body;
  const admin = await User.findOne({ caFirmId: req.params.id, role: "ca_firm_admin" });
  if (!admin) throw new ApiError(404, "CA firm admin not found");

  const usingOwnPassword = !!newPassword;
  const tempPassword = usingOwnPassword ? null : generateTempPassword();
  admin.passwordHash = await bcrypt.hash(usingOwnPassword ? newPassword : tempPassword, SALT_ROUNDS);
  admin.mustChangePassword = !usingOwnPassword;
  admin.tokenVersion += 1;
  await admin.save();

  await writeAuditLog(req, {
    action: "ca_firm.admin_password_reset",
    targetType: "CaFirm",
    targetId: req.params.id,
    targetLabel: admin.name,
  });

  await createNotification({
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

export const getCaFirm = catchAsync(async (req, res) => {
  const firm = await CaFirm.findById(req.params.id);
  if (!firm) throw new ApiError(404, "CA firm not found");
  res.json({ success: true, data: firm });
});

// Hard delete: also removes every user (admin/staff/business-client accounts) and
// business client record nested under this firm, since none of them can exist
// without their parent tenant.
export const deleteCaFirm = catchAsync(async (req, res) => {
  const firm = await CaFirm.findById(req.params.id);
  if (!firm) throw new ApiError(404, "CA firm not found");

  await User.deleteMany({ caFirmId: firm._id });
  await BusinessClient.deleteMany({ caFirmId: firm._id });
  await firm.deleteOne();

  await writeAuditLog(req, {
    action: "ca_firm.deleted",
    targetType: "CaFirm",
    targetId: firm._id,
    targetLabel: firm.name,
  });

  res.json({ success: true, message: "CA firm deleted" });
});

export const updateCaFirm = catchAsync(async (req, res) => {
  const { name, email, phone, address, icaiRegistrationNumber, constitutionType, pan, gstin, isActive } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (email !== undefined) update.email = email;
  if (phone !== undefined) update.phone = phone;
  if (address !== undefined) update.address = address;
  if (icaiRegistrationNumber !== undefined) update.icaiRegistrationNumber = icaiRegistrationNumber;
  if (constitutionType !== undefined) update.constitutionType = constitutionType;
  if (pan !== undefined) update.pan = pan;
  if (gstin !== undefined) update.gstin = gstin;
  if (isActive !== undefined) update.isActive = isActive;

  const firm = await CaFirm.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!firm) throw new ApiError(404, "CA firm not found");

  if (isActive !== undefined) {
    await writeAuditLog(req, {
      action: isActive ? "ca_firm.activated" : "ca_firm.suspended",
      targetType: "CaFirm",
      targetId: firm._id,
      targetLabel: firm.name,
    });

    await createNotification({
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

export const updateSubscription = catchAsync(async (req, res) => {
  const { tier, status, billingCycle, expiryDate } = req.body;
  const update = {};
  if (tier !== undefined) {
    update["plan.tier"] = tier;
    update["plan.seatLimit"] = PLAN_LIMITS[tier].seatLimit;
    update["plan.businessClientLimit"] = PLAN_LIMITS[tier].businessClientLimit;
  }
  if (status !== undefined) update["plan.status"] = status;
  if (billingCycle !== undefined) update["plan.billingCycle"] = billingCycle;
  if (expiryDate !== undefined) update["plan.expiryDate"] = expiryDate;

  const firm = await CaFirm.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!firm) throw new ApiError(404, "CA firm not found");

  res.json({ success: true, data: firm, message: "Subscription updated" });
});

// Read-only plan/status check open to every role in a firm, so any
// teammate's dashboard can know if the trial/subscription has lapsed.
export const getMyFirmPlan = catchAsync(async (req, res) => {
  if (!req.user.caFirmId) return res.json({ success: true, data: null });
  const firm = await CaFirm.findById(req.user.caFirmId).select("name plan isActive");
  if (!firm) return res.json({ success: true, data: null });
  const grace = getGraceInfo(firm.plan);
  res.json({
    success: true,
    data: {
      firmName: firm.name,
      isActive: firm.isActive,
      plan: firm.plan,
      inGracePeriod: grace.inGracePeriod,
      graceEndDate: grace.graceEndDate,
      isReadOnly: firm.isActive === false || firm.plan.status === "suspended" || grace.isReadOnly,
    },
  });
});

export const getMyFirm = catchAsync(async (req, res) => {
  const firm = await CaFirm.findById(req.user.caFirmId);
  if (!firm) throw new ApiError(404, "CA firm not found");
  res.json({ success: true, data: firm });
});

export const updateMyFirm = catchAsync(async (req, res) => {
  const { name, email, phone, address, icaiRegistrationNumber, constitutionType, pan, gstin } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (email !== undefined) update.email = email;
  if (phone !== undefined) update.phone = phone;
  if (address !== undefined) update.address = address;
  if (icaiRegistrationNumber !== undefined) update.icaiRegistrationNumber = icaiRegistrationNumber;
  if (constitutionType !== undefined) update.constitutionType = constitutionType;
  if (pan !== undefined) update.pan = pan;
  if (gstin !== undefined) update.gstin = gstin;

  const firm = await CaFirm.findByIdAndUpdate(req.user.caFirmId, update, {
    new: true,
    runValidators: true,
  });
  if (!firm) throw new ApiError(404, "CA firm not found");
  res.json({ success: true, data: firm, message: "Firm settings updated" });
});

// Tier catalog for the Subscription page — limits from PLAN_LIMITS merged with the
// Super Admin's configured pricing. All 3 tiers (including Enterprise) now carry a
// real price and are self-pay via Razorpay — see createSubscriptionOrder below.
export const getPlanCatalog = catchAsync(async (req, res) => {
  const settings = await getSystemSettings();
  res.json({
    success: true,
    data: {
      currency: settings.currency,
      tiers: {
        starter: { ...PLAN_LIMITS.starter, price: settings.starterPrice },
        growth: { ...PLAN_LIMITS.growth, price: settings.growthPrice },
        enterprise: { ...PLAN_LIMITS.enterprise, price: settings.enterprisePrice },
      },
    },
  });
});

function priceForTier(settings, tier: string) {
  return { starter: settings.starterPrice, growth: settings.growthPrice, enterprise: settings.enterprisePrice }[tier];
}

// Deliberately excluded from requireActiveFirm: paying to (re)activate is the one
// thing a suspended/expired firm must still be able to do.
export const createSubscriptionOrder = catchAsync(async (req, res) => {
  const { tier, billingCycle } = req.body;
  const firm = await CaFirm.findById(req.user.caFirmId);
  if (!firm) throw new ApiError(404, "CA firm not found");

  const settings = await getSystemSettings();
  const monthlyPrice = priceForTier(settings, tier);
  if (!monthlyPrice) throw new ApiError(400, "Invalid plan tier");
  const amount = billingCycle === "annual" ? monthlyPrice * 12 : monthlyPrice;

  const order = await razorpay.orders.create({
    amount: amount * 100, // paise
    currency: settings.currency || "INR",
    receipt: `ca_firm_${firm._id}_${Date.now()}`,
    notes: { caFirmId: firm._id.toString(), tier, billingCycle },
  });

  await CaFirmPayment.create({
    caFirmId: firm._id,
    userId: req.user.id,
    tier,
    billingCycle,
    orderId: order.id,
    amount,
    currency: settings.currency || "INR",
    status: "PENDING",
  });

  res.json({
    success: true,
    data: { orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, firmName: firm.name },
  });
});

// Same security sequence as hrms/controllers/saasController.ts's verifyRazorpayPayment:
// duplicate-payment check, HMAC signature verification, then a secure status re-fetch
// from Razorpay itself before ever trusting the client-supplied payment id.
export const verifySubscriptionPayment = catchAsync(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const payment = await CaFirmPayment.findOne({ orderId: razorpay_order_id, caFirmId: req.user.caFirmId });
  if (!payment) throw new ApiError(404, "Order not found");
  if (payment.status === "CAPTURED") throw new ApiError(400, "This order has already been processed");

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  if (expectedSignature !== razorpay_signature) {
    payment.status = "FAILED";
    await payment.save();
    throw new ApiError(400, "Invalid payment signature");
  }

  const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
  if (paymentDetails.status !== "captured") throw new ApiError(400, "Payment not captured by Razorpay");

  const firm = await CaFirm.findById(req.user.caFirmId);
  if (!firm) throw new ApiError(404, "CA firm not found");

  const now = new Date();
  const expiryDate = new Date(now);
  if (payment.billingCycle === "annual") expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  else expiryDate.setMonth(expiryDate.getMonth() + 1);

  firm.plan.tier = payment.tier;
  firm.plan.status = "active";
  firm.plan.billingCycle = payment.billingCycle;
  firm.plan.seatLimit = PLAN_LIMITS[payment.tier].seatLimit;
  firm.plan.businessClientLimit = PLAN_LIMITS[payment.tier].businessClientLimit;
  firm.plan.startDate = now;
  firm.plan.expiryDate = expiryDate;
  await firm.save();

  payment.paymentId = razorpay_payment_id;
  payment.signature = razorpay_signature;
  payment.status = "CAPTURED";
  payment.expiryDate = expiryDate;
  await payment.save();

  await writeAuditLog(req, {
    action: "ca_firm.subscription_paid",
    targetType: "CaFirm",
    targetId: firm._id,
    targetLabel: firm.name,
    metadata: { tier: payment.tier, billingCycle: payment.billingCycle, amount: payment.amount },
  });

  res.json({ success: true, data: { plan: firm.plan }, message: "Payment verified — your plan is now active." });
});

export const getSubscriptionPaymentHistory = catchAsync(async (req, res) => {
  const payments = await CaFirmPayment.find({ caFirmId: req.user.caFirmId }).sort({ createdAt: -1 });
  res.json({ success: true, data: payments });
});
