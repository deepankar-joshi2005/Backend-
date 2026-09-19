import bcrypt from "bcryptjs";
import CaFirm from "../models/CaFirm";
import User from "../models/User";
import BusinessClient from "../models/BusinessClient";
import Lead from "../models/Lead";
import HrmsPlanTier from "../models/HrmsPlanTier";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { getPagination, buildMeta } from "../utils/paginate";
import { generateTempPassword } from "../utils/generatePassword";
import { writeAuditLog } from "../utils/writeAuditLog";
import { getSystemSettings } from "../utils/getSystemSettings";
import { sendMail } from "../utils/sendMail";
import { credentialsWelcomeEmail } from "../utils/emailTemplates";
import { provisionHrmsCompany, getHrmsSsoToken, getCaProxyHrmsSsoToken } from "../utils/provisionHrms";
import HrmsCompany from "../hrms/models/hrms/Company";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

// Shared by createBusinessClient (useHrms ticked at onboarding) and
// upgradeToHrms (useHrms turned on later for an existing client) — creates the
// business_client_admin login, provisions the HRMS company (best-effort), and
// emails credentials. Does NOT persist client.hrmsCompanyId/Code — callers
// must client.save() afterward alongside whatever else they're changing.
async function provisionHrmsForClient(
  client,
  firm,
  { adminName, adminEmail, adminPassword, planTierId }: { adminName: string; adminEmail: string; adminPassword?: string; planTierId: string },
  req
) {
  if (!adminEmail) throw new ApiError(400, "An email is required to create the HRMS login");
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) throw new ApiError(409, "An account with this admin email already exists");
  if (!planTierId) throw new ApiError(400, "Select an HRMS plan for this client");
  const planTier = await HrmsPlanTier.findById(planTierId);
  if (!planTier) throw new ApiError(404, "Selected HRMS plan not found");

  const usingOwnPassword = !!adminPassword;
  const tempPassword = usingOwnPassword ? null : generateTempPassword();
  const passwordHash = await bcrypt.hash(usingOwnPassword ? adminPassword : tempPassword, SALT_ROUNDS);

  const admin = await User.create({
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: "business_client_admin",
    caFirmId: firm._id,
    businessClientId: client._id,
    mustChangePassword: !usingOwnPassword,
    createdBy: req.user.id,
  });

  try {
    const provisioned = await provisionHrmsCompany({
      companyName: client.name,
      adminName,
      adminEmail,
      adminPasswordHash: passwordHash,
      adminPhone: client.phone,
      caFirmId: firm._id.toString(),
      caFirmName: firm.name,
      employeeLimit: planTier.maxEmployees ?? 999999,
      planTier: planTier.name,
    });
    if (provisioned) {
      client.hrmsCompanyId = provisioned.hrmsCompanyId;
      client.hrmsCompanyCode = provisioned.hrmsCompanyCode;
    }
  } catch (err) {
    console.error("Failed to provision HRMS company:", err.message);
  }

  try {
    const settings = await getSystemSettings();
    const { subject, html } = credentialsWelcomeEmail({
      platformName: settings.platformName,
      firmName: client.name,
      recipientName: admin.name,
      email: admin.email,
      password: usingOwnPassword ? adminPassword : tempPassword,
      loginUrl: `${process.env.CLIENT_URL}/login`,
    });
    await sendMail({ to: admin.email, subject, html });
  } catch (err) {
    console.error("Failed to send business client admin welcome email:", err.message);
  }

  return { admin, tempPassword };
}

// Aggregate-only — Super Admin sees counts, never an individual business
// client's own data (Role Matrix: "Super Admin has no default access to any
// tenant's operational data"). Full detail lives in the CA Firm Admin's own
// HRMS module once that's built.
export const getBusinessClientSummary = catchAsync(async (req, res) => {
  const [total, active, suspended, byFirm] = await Promise.all([
    BusinessClient.countDocuments(),
    BusinessClient.countDocuments({ isActive: true }),
    BusinessClient.countDocuments({ isActive: false }),
    BusinessClient.aggregate([
      { $group: { _id: "$caFirmId", count: { $sum: 1 } } },
      { $lookup: { from: "cafirms", localField: "_id", foreignField: "_id", as: "firm" } },
      { $unwind: "$firm" },
      { $project: { _id: 0, caFirmId: "$_id", firmName: "$firm.name", count: 1 } },
      { $sort: { count: -1 } },
    ]),
  ]);

  res.json({ success: true, data: { total, active, suspended, byFirm } });
});

// Billing/plan visibility only — name, owning firm, HRMS plan tier, status,
// expiry. Deliberately NOT the full record (PAN/GSTIN/address/contacts stay
// with the CA firm per the Role Matrix's tenant-isolation rule above); this
// is platform billing oversight, the same category of data Super Admin
// already sees for CA Firm subscriptions.
export const listBusinessClientsForSuperAdmin = catchAsync(async (req, res) => {
  const clients = await BusinessClient.find()
    .select("name useHrms hrmsCompanyId isActive caFirmId")
    .populate("caFirmId", "name")
    .sort({ createdAt: -1 });

  const hrmsCompanyIds = clients.map((c) => c.hrmsCompanyId).filter(Boolean);
  const companies = await HrmsCompany.find({ _id: { $in: hrmsCompanyIds } }).select(
    "planTier subscriptionPlan subscriptionStatus subscriptionEndDate employeeLimit"
  );
  const companyById = new Map(companies.map((c) => [String(c._id), c]));

  res.json({
    success: true,
    data: clients.map((c) => {
      const company = c.hrmsCompanyId ? companyById.get(String(c.hrmsCompanyId)) : null;
      return {
        _id: c._id,
        name: c.name,
        caFirmName: (c.caFirmId as any)?.name || "—",
        useHrms: c.useHrms,
        isActive: c.isActive,
        planTier: company?.planTier || null,
        subscriptionPlan: company?.subscriptionPlan || null,
        subscriptionStatus: company?.subscriptionStatus || null,
        subscriptionEndDate: company?.subscriptionEndDate || null,
        employeeLimit: company?.employeeLimit || null,
      };
    }),
  });
});

// Everything below is the CA Firm Admin's own view — scoped to their firm only.

export const listMyBusinessClients = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { caFirmId: req.user.caFirmId };
  if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };

  const [clients, total, firm] = await Promise.all([
    BusinessClient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    BusinessClient.countDocuments(filter),
    CaFirm.findById(req.user.caFirmId).select("plan.businessClientLimit"),
  ]);
  const usedCount = await BusinessClient.countDocuments({ caFirmId: req.user.caFirmId });

  res.json({
    success: true,
    data: clients,
    meta: buildMeta({ page, limit, total }),
    limit: { used: usedCount, max: firm.plan.businessClientLimit },
  });
});

// Per Multi-Tenancy doc Section 4.2: CA Firm Admin onboards the business client and
// its admin gets their own login, invited by email with credentials.
export const createBusinessClient = catchAsync(async (req, res) => {
  const {
    name,
    email,
    phone,
    leadId,
    clientType,
    pan,
    gstin,
    industry,
    contactPerson,
    address,
    city,
    state,
    pincode,
    services,
  } = req.body;
  const { adminName, adminEmail, adminPassword, planTierId } = req.body;

  // "Use HRMS" defaults on (matches the always-on behaviour before this was a
  // checkbox); when it's ticked, the admin login is auto-derived from the
  // Primary Contact fields rather than asking for a separate admin name/email.
  const wantsHrms = req.body.useHrms !== false;
  const resolvedAdminName = adminName || contactPerson || name;
  const resolvedAdminEmail = adminEmail || email;

  let planTier = null;
  if (wantsHrms) {
    if (!resolvedAdminEmail) throw new ApiError(400, "An email is required to create the HRMS login");
    const existingAdmin = await User.findOne({ email: resolvedAdminEmail });
    if (existingAdmin) throw new ApiError(409, "An account with this admin email already exists");
    if (!planTierId) throw new ApiError(400, "Select an HRMS plan for this client");
    planTier = await HrmsPlanTier.findById(planTierId);
    if (!planTier) throw new ApiError(404, "Selected HRMS plan not found");
  }

  const firm = await CaFirm.findById(req.user.caFirmId);
  if (firm.plan.businessClientLimit !== null) {
    const usedCount = await BusinessClient.countDocuments({ caFirmId: firm._id });
    if (usedCount >= firm.plan.businessClientLimit) {
      throw new ApiError(403, `Business client limit reached for the ${firm.plan.tier} plan. Upgrade to add more.`);
    }
  }

  // Every Business Client needs a backing Lead record, because Compliance Tool
  // (Module Scope doc, Section 4) only ever tracks filings against a Lead —
  // this is what lets a Business Client get compliance tasks at all. Reuse an
  // already-converted lead when provisioning HRMS from the CRM "Clients" tab;
  // otherwise (direct onboarding here) create one automatically.
  let lead;
  if (leadId) {
    lead = await Lead.findOne({ _id: leadId, caFirmId: firm._id, status: "converted" });
    if (!lead) throw new ApiError(404, "Converted lead not found");
    if (lead.businessClientId) throw new ApiError(409, "This client already has a Business Client account");
  } else {
    lead = await Lead.create({
      name,
      leadType: "business",
      phone: phone || "Not provided",
      email,
      source: "other",
      status: "converted",
      caFirmId: firm._id,
      createdBy: req.user.id,
      statusHistory: [
        { status: "new", changedBy: req.user.id, changedByName: req.currentUser.name },
        {
          status: "converted",
          changedBy: req.user.id,
          changedByName: req.currentUser.name,
          note: "Auto-created for direct Business Client onboarding",
        },
      ],
    });
  }

  const client = await BusinessClient.create({
    name: name || lead.name,
    email: email || lead.email,
    phone: phone || lead.phone,
    clientType,
    pan,
    gstin,
    industry,
    contactPerson,
    address,
    city,
    state,
    pincode,
    services,
    useHrms: wantsHrms,
    caFirmId: firm._id,
    createdBy: req.user.id,
    leadId: lead._id,
  });

  lead.businessClientId = client._id;
  await lead.save();

  let admin = null;
  let tempPassword = null;

  if (wantsHrms) {
    try {
      const result = await provisionHrmsForClient(
        client,
        firm,
        { adminName: resolvedAdminName, adminEmail: resolvedAdminEmail, adminPassword, planTierId },
        req
      );
      admin = result.admin;
      tempPassword = result.tempPassword;
      await client.save(); // persists hrmsCompanyId/Code set inside the helper
    } catch (err) {
      await BusinessClient.findByIdAndDelete(client._id);
      throw err;
    }
  }

  await writeAuditLog(req, {
    action: "business_client.created",
    targetType: "BusinessClient",
    targetId: client._id,
    targetLabel: client.name,
  });

  res.status(201).json({
    success: true,
    data: {
      client,
      admin: admin && { id: admin._id, name: admin.name, email: admin.email, tempPassword },
    },
    message: !wantsHrms
      ? "Business client onboarded."
      : tempPassword
        ? "Business client onboarded. Login credentials have been emailed to their admin."
        : "Business client onboarded. Their admin can log in with the password you set.",
  });
});

export const getBusinessClient = catchAsync(async (req, res) => {
  const client = await BusinessClient.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId });
  if (!client) throw new ApiError(404, "Business client not found");
  res.json({ success: true, data: client });
});

// Powers the "Payroll Management" sidebar module — a single combined list of
// everything payroll could apply to: real Business Clients (any useHrms value,
// so the frontend can branch to Excel payroll vs. HRMS SSO) plus converted
// leads that were never formally onboarded into a Business Client at all.
export const listPayrollEligibleClients = catchAsync(async (req, res) => {
  const [clients, leads] = await Promise.all([
    BusinessClient.find({ caFirmId: req.user.caFirmId }).sort({ name: 1 }).lean(),
    Lead.find({ caFirmId: req.user.caFirmId, status: "converted", businessClientId: null })
      .select("name phone email company")
      .sort({ name: 1 })
      .lean(),
  ]);

  const businessClients = clients.map((c) => ({
    kind: "business_client",
    _id: c._id,
    name: c.name,
    useHrms: c.useHrms,
    gstin: c.gstin || null,
    pan: c.pan || null,
    clientType: c.clientType,
    contactPerson: c.contactPerson || null,
    phone: c.phone || null,
    email: c.email || null,
  }));

  const leadClients = leads.map((l) => ({
    kind: "lead",
    _id: l._id,
    name: l.name,
    useHrms: false,
    gstin: null,
    pan: null,
    clientType: null,
    contactPerson: l.company || null,
    phone: l.phone || null,
    email: l.email || null,
  }));

  res.json({ success: true, data: [...businessClients, ...leadClients] });
});

// Same combined list, exposed under a neutral name/route for features unrelated to
// payroll (e.g. Personal Finance Tracker) that also need every client to pick from —
// and staff-accessible, unlike the payroll-only route above.
export const listClientDirectory = listPayrollEligibleClients;

// Selecting a lead-only row in Payroll Management calls this to silently
// provision a lightweight, non-HRMS Business Client behind the scenes before
// navigating to the Excel payroll page — the CA never sees a separate
// "add business client" step for these.
export const provisionBusinessClientFromLead = catchAsync(async (req, res) => {
  const firm = await CaFirm.findById(req.user.caFirmId);
  const lead = await Lead.findOne({ _id: req.params.leadId, caFirmId: firm._id, status: "converted" });
  if (!lead) throw new ApiError(404, "Converted lead not found");

  if (lead.businessClientId) {
    const client = await BusinessClient.findById(lead.businessClientId);
    return res.json({ success: true, data: { client }, message: "Already set up" });
  }

  if (firm.plan.businessClientLimit !== null) {
    const usedCount = await BusinessClient.countDocuments({ caFirmId: firm._id });
    if (usedCount >= firm.plan.businessClientLimit) {
      throw new ApiError(403, `Business client limit reached for the ${firm.plan.tier} plan. Upgrade to add more.`);
    }
  }

  const client = await BusinessClient.create({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    industry: lead.industry,
    city: lead.city,
    useHrms: false,
    caFirmId: firm._id,
    createdBy: req.user.id,
    leadId: lead._id,
  });

  lead.businessClientId = client._id;
  await lead.save();

  await writeAuditLog(req, {
    action: "business_client.created",
    targetType: "BusinessClient",
    targetId: client._id,
    targetLabel: client.name,
  });

  res.status(201).json({ success: true, data: { client }, message: "Client set up for Excel payroll" });
});

// Lets a CA firm move a client that started on Excel-based payroll onto real
// HRMS later — updateMyBusinessClient deliberately never touches useHrms
// (see the model comment), so this is the only way to flip it.
export const upgradeToHrms = catchAsync(async (req, res) => {
  const client = await BusinessClient.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId });
  if (!client) throw new ApiError(404, "Business client not found");
  if (client.useHrms) throw new ApiError(400, "This client already uses HRMS");

  const firm = await CaFirm.findById(req.user.caFirmId);
  const { adminName, adminEmail, adminPassword, planTierId } = req.body;
  const resolvedAdminName = adminName || client.contactPerson || client.name;
  const resolvedAdminEmail = adminEmail || client.email;

  const { admin, tempPassword } = await provisionHrmsForClient(
    client,
    firm,
    { adminName: resolvedAdminName, adminEmail: resolvedAdminEmail, adminPassword, planTierId },
    req
  );

  client.useHrms = true;
  await client.save();

  await writeAuditLog(req, {
    action: "business_client.upgraded_to_hrms",
    targetType: "BusinessClient",
    targetId: client._id,
    targetLabel: client.name,
  });

  res.json({
    success: true,
    data: { client, admin: { id: admin._id, name: admin.name, email: admin.email, tempPassword } },
    message: tempPassword
      ? "Upgraded to HRMS. Login credentials have been emailed to their admin."
      : "Upgraded to HRMS. Their admin can log in with the password you set.",
  });
});

// Lets CA Firm Admin/Staff open a Business Client's real HRMS Payroll screens
// and run payroll on its behalf — see getCaProxyHrmsSsoToken. Distinct from
// getMyHrmsSsoToken above, which is the *client's own* admin/employee trading
// their verified session for an HRMS one.
export const getBusinessClientHrmsSsoToken = catchAsync(async (req, res) => {
  const client = await BusinessClient.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId });
  if (!client) throw new ApiError(404, "Business client not found");
  if (!client.hrmsCompanyId) throw new ApiError(404, "HRMS is not set up for this client yet");

  const token = await getCaProxyHrmsSsoToken(client.hrmsCompanyId);
  res.json({ success: true, data: { token } });
});

// The business client's own view of itself — used by its Admin/Employee to know
// whether their HRMS is provisioned yet and get their firm's display name.
export const getMyBusinessClient = catchAsync(async (req, res) => {
  if (!req.user.businessClientId) return res.json({ success: true, data: null });
  const client = await BusinessClient.findById(req.user.businessClientId).select("name hrmsCompanyId isActive");
  if (!client) return res.json({ success: true, data: null });
  res.json({ success: true, data: client });
});

// Powers the "log in once, land in HRMS" flow — CA-Management has already
// verified this user's password, so it trades their (verified) email for a real
// HRMS session token instead of asking them to log in a second time.
export const getMyHrmsSsoToken = catchAsync(async (req, res) => {
  if (!req.user.businessClientId) throw new ApiError(404, "No business client linked to this account");
  const client = await BusinessClient.findById(req.user.businessClientId).select("hrmsCompanyId");
  if (!client?.hrmsCompanyId) throw new ApiError(404, "HRMS is not set up for this account yet");

  const token = await getHrmsSsoToken(req.currentUser.email);
  res.json({ success: true, data: { token } });
});

export const updateMyBusinessClient = catchAsync(async (req, res) => {
  const {
    name,
    email,
    phone,
    isActive,
    clientType,
    pan,
    gstin,
    industry,
    contactPerson,
    address,
    city,
    state,
    pincode,
    services,
  } = req.body;
  const client = await BusinessClient.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId });
  if (!client) throw new ApiError(404, "Business client not found");

  if (name !== undefined) client.name = name;
  if (email !== undefined) client.email = email;
  if (phone !== undefined) client.phone = phone;
  if (isActive !== undefined) client.isActive = isActive;
  if (clientType !== undefined) client.clientType = clientType;
  if (pan !== undefined) client.pan = pan;
  if (gstin !== undefined) client.gstin = gstin;
  if (industry !== undefined) client.industry = industry;
  if (contactPerson !== undefined) client.contactPerson = contactPerson;
  if (address !== undefined) client.address = address;
  if (city !== undefined) client.city = city;
  if (state !== undefined) client.state = state;
  if (pincode !== undefined) client.pincode = pincode;
  if (services !== undefined) client.services = services;
  await client.save();

  await writeAuditLog(req, {
    action:
      isActive === undefined ? "business_client.updated" : isActive ? "business_client.activated" : "business_client.suspended",
    targetType: "BusinessClient",
    targetId: client._id,
    targetLabel: client.name,
  });

  res.json({ success: true, data: client, message: "Business client updated" });
});

export const deleteBusinessClient = catchAsync(async (req, res) => {
  const client = await BusinessClient.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId });
  if (!client) throw new ApiError(404, "Business client not found");

  await User.deleteMany({ businessClientId: client._id, role: "business_client_admin" });
  if (client.leadId) await Lead.findByIdAndUpdate(client.leadId, { businessClientId: null });
  await client.deleteOne();

  await writeAuditLog(req, {
    action: "business_client.deleted",
    targetType: "BusinessClient",
    targetId: client._id,
    targetLabel: client.name,
  });

  res.json({ success: true, message: "Business client deleted" });
});

export const resetBusinessClientAdminPassword = catchAsync(async (req, res) => {
  const { newPassword } = req.body;
  const client = await BusinessClient.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId });
  if (!client) throw new ApiError(404, "Business client not found");

  const admin = await User.findOne({ businessClientId: client._id, role: "business_client_admin" });
  if (!admin) throw new ApiError(404, "Business client admin not found");

  const usingOwnPassword = !!newPassword;
  const tempPassword = usingOwnPassword ? null : generateTempPassword();
  admin.passwordHash = await bcrypt.hash(usingOwnPassword ? newPassword : tempPassword, SALT_ROUNDS);
  admin.mustChangePassword = !usingOwnPassword;
  admin.tokenVersion += 1;
  await admin.save();

  await writeAuditLog(req, {
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
