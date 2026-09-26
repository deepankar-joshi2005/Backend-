import crypto from "crypto";
import bcrypt from "bcryptjs";
import CaFirm from "../models/CaFirm";
import User from "../models/User";
import BusinessClient from "../models/BusinessClient";
import Lead from "../models/Lead";
import HrmsPlanTier from "../models/HrmsPlanTier";
import ClientEmployee from "../models/ClientEmployee";
import ClientEmployeeSalaryStructure from "../models/ClientEmployeeSalaryStructure";
import ClientPayrollRun from "../models/ClientPayrollRun";
import ClientPayrollEntry from "../models/ClientPayrollEntry";
import ClientPayrollSettings from "../models/ClientPayrollSettings";
import ClientPaymentFile from "../models/ClientPaymentFile";
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
import { generateNextEmployeeCode, toNameKey } from "../utils/employeeIdGenerator";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

// Shared by createBusinessClient (useHrms ticked at onboarding) and
// upgradeToHrms (useHrms turned on later for an existing client) — creates or
// reuses the business_client_admin login, provisions the HRMS company
// (best-effort), and emails credentials. Does NOT persist
// client.hrmsCompanyId/Code — callers must client.save() afterward alongside
// whatever else they're changing.
async function provisionHrmsForClient(
  client,
  firm,
  {
    adminName,
    adminEmail,
    adminPassword,
    planTierId,
    planTier: prefetchedPlanTier,
  }: { adminName: string; adminEmail: string; adminPassword?: string; planTierId?: string; planTier?: any },
  req
) {
  if (!adminEmail) throw new ApiError(400, "An email is required to create the HRMS login");
  // A plan is optional at provisioning time — leaving it unselected still
  // creates the HRMS company, just left unsubscribed (subscriptionMiddleware
  // blocks it with a "please subscribe" prompt until the client pays via
  // billing, at which point employeeLimit/planTier get set for real anyway).
  // Reuse the caller's lookup when it already has one (createBusinessClient
  // fetches it upfront to validate before doing anything else) — avoids a
  // redundant round trip on the hot "add client" path.
  let planTier = prefetchedPlanTier || null;
  if (!planTier && planTierId) {
    planTier = await HrmsPlanTier.findById(planTierId);
    if (!planTier) throw new ApiError(404, "Selected HRMS plan not found");
  }

  // Every Business Client already gets a business_client_admin login at
  // creation time now, regardless of useHrms (see createBusinessClient) — so
  // upgrading a non-HRMS client reuses that existing login instead of trying
  // to create a second one (which would collide on email with itself).
  let admin = await User.findOne({ businessClientId: client._id, role: "business_client_admin" });

  const existingOtherAdmin = await User.findOne({ email: adminEmail, _id: { $ne: admin?._id } });
  if (existingOtherAdmin) throw new ApiError(409, "An account with this admin email already exists");

  const usingOwnPassword = !!adminPassword;
  const tempPassword = usingOwnPassword ? null : generateTempPassword(client.name);
  const passwordHash = await bcrypt.hash(usingOwnPassword ? adminPassword : tempPassword, SALT_ROUNDS);

  if (admin) {
    admin.name = adminName;
    admin.email = adminEmail;
    admin.passwordHash = passwordHash;
    admin.mustChangePassword = !usingOwnPassword;
    admin.tokenVersion += 1;
    await admin.save();
  } else {
    admin = await User.create({
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

  try {
    const provisioned = await provisionHrmsCompany({
      companyName: client.name,
      adminName,
      adminEmail,
      adminPasswordHash: passwordHash,
      adminPhone: client.phone,
      caFirmId: firm._id.toString(),
      caFirmName: firm.name,
      employeeLimit: planTier?.maxEmployees ?? 0,
      planTier: planTier?.name,
    });
    if (provisioned) {
      client.hrmsCompanyId = provisioned.hrmsCompanyId;
      client.hrmsCompanyCode = provisioned.hrmsCompanyCode;
    }
  } catch (err) {
    console.error("Failed to provision HRMS company:", err.message);
  }

  // Fire-and-forget — the temp password is already returned in the API
  // response (FirmCreatedNotice/TempPasswordNotice show it on-screen), so the
  // request doesn't need to wait on an SMTP round trip to complete.
  getSystemSettings()
    .then((settings) => {
      const { subject, html } = credentialsWelcomeEmail({
        platformName: settings.platformName,
        firmName: client.name,
        recipientName: admin.name,
        email: admin.email,
        password: usingOwnPassword ? adminPassword : tempPassword,
        loginUrl: `${process.env.CLIENT_URL}/login`,
      });
      return sendMail({ to: admin.email, subject, html });
    })
    .catch((err) => console.error("Failed to send business client admin welcome email:", err.message));

  return { admin, tempPassword };
}

// Mirrors provisionHrmsForClient but for clients that don't want HRMS at all
// — still creates a real business_client_admin login (so they can manage
// their own employees at /client-admin and set up the employee onboarding
// link), just skips HRMS company provisioning entirely.
async function createClientAdminLogin(
  client,
  firm,
  { adminName, adminEmail, adminPassword }: { adminName: string; adminEmail: string; adminPassword?: string },
  req
) {
  if (!adminEmail) throw new ApiError(400, "An email is required to create this client's login");
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) throw new ApiError(409, "An account with this admin email already exists");

  const usingOwnPassword = !!adminPassword;
  const tempPassword = usingOwnPassword ? null : generateTempPassword(client.name);
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

  // Fire-and-forget — same reasoning as provisionHrmsForClient above.
  getSystemSettings()
    .then((settings) => {
      const { subject, html } = credentialsWelcomeEmail({
        platformName: settings.platformName,
        firmName: client.name,
        recipientName: admin.name,
        email: admin.email,
        password: usingOwnPassword ? adminPassword : tempPassword,
        loginUrl: `${process.env.CLIENT_URL}/login`,
      });
      return sendMail({ to: admin.email, subject, html });
    })
    .catch((err) => console.error("Failed to send business client admin welcome email:", err.message));

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
    clientName,
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
  // checkbox); the admin login is auto-derived from the Primary Contact
  // fields rather than asking for a separate admin name/email. Every Business
  // Client gets this login now, regardless of useHrms — when HRMS is off it
  // just lands on /client-admin instead of being handed off to HRMS.
  const wantsHrms = req.body.useHrms !== false;
  const resolvedAdminName = adminName || contactPerson || name;
  const resolvedAdminEmail = adminEmail || email;

  if (!resolvedAdminEmail) throw new ApiError(400, "An email is required to create this client's login");
  const existingAdmin = await User.findOne({ email: resolvedAdminEmail });
  if (existingAdmin) throw new ApiError(409, "An account with this admin email already exists");

  let planTier = null;
  if (wantsHrms && planTierId) {
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
  // otherwise (direct onboarding here) reuse a matching unlinked converted
  // lead if one already exists (e.g. this client was converted in CRM first),
  // so onboarding here doesn't leave that original lead orphaned as a
  // duplicate "Individual client" card in Payroll Management once this
  // Business Client is deleted — only create a fresh one as a last resort.
  let lead;
  if (leadId) {
    lead = await Lead.findOne({ _id: leadId, caFirmId: firm._id, status: "converted" });
    if (!lead) throw new ApiError(404, "Converted lead not found");
    if (lead.businessClientId) throw new ApiError(409, "This client already has a Business Client account");
  } else {
    if (email) {
      lead = await Lead.findOne({ caFirmId: firm._id, status: "converted", businessClientId: null, email: email.toLowerCase().trim() });
    }
    if (!lead) {
      lead = await Lead.create({
        name,
        leadType: "business",
        phone: phone || "Not provided",
        email,
        source: "other",
        status: "converted",
        caFirmId: firm._id,
        createdBy: req.user.id,
        // Never went through the CRM pipeline — keep it out of the CRM page's
        // own lead lists (see the model comment on this field).
        hiddenFromCrm: true,
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
  }

  const client = await BusinessClient.create({
    name: name || lead.name,
    clientName,
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
    // Public, password-protected employee self-onboarding link — generated
    // for every client; only surfaced in the UI for non-HRMS ones today.
    employeeFormToken: crypto.randomBytes(16).toString("hex"),
  });

  lead.businessClientId = client._id;
  await lead.save();

  let admin = null;
  let tempPassword = null;

  try {
    const result = wantsHrms
      ? await provisionHrmsForClient(
          client,
          firm,
          { adminName: resolvedAdminName, adminEmail: resolvedAdminEmail, adminPassword, planTierId, planTier },
          req
        )
      : await createClientAdminLogin(client, firm, { adminName: resolvedAdminName, adminEmail: resolvedAdminEmail, adminPassword }, req);
    admin = result.admin;
    tempPassword = result.tempPassword;
    await client.save(); // persists hrmsCompanyId/Code set inside provisionHrmsForClient (no-op otherwise)
  } catch (err) {
    await BusinessClient.findByIdAndDelete(client._id);
    throw err;
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
    message: tempPassword
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
    clientName,
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
  if (clientName !== undefined) client.clientName = clientName;
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
  // Deleted (not just unlinked) — a Lead left with businessClientId: null
  // would re-match listPayrollEligibleClients' "converted, not yet
  // provisioned" query and reappear in Payroll Management under the same
  // name, looking like the client was never actually deleted. Match on both
  // client.leadId and the reverse businessClientId link (rather than only
  // client.leadId) so a lead stays in sync even if only one side of the link
  // was ever set. caFirmId-scoped and built from concrete ids only — never
  // hand an empty/undefined clause to $or, since a stripped-undefined `_id`
  // clause would silently match (and delete) every Lead in the collection.
  const leadIdsToDelete = [client.leadId].filter(Boolean);
  await Lead.deleteMany({
    caFirmId: client.caFirmId,
    $or: [{ _id: { $in: leadIdsToDelete } }, { businessClientId: client._id }],
  });
  // Non-HRMS payroll data has nowhere else to point once the client is gone
  // — clean it all up rather than leaving orphaned records behind. Resolve
  // the run IDs before deleting anything in parallel, so ClientPayrollEntry's
  // cleanup isn't racing ClientPayrollRun's own deleteMany below.
  const runIds = await ClientPayrollRun.find({ businessClientId: client._id }).distinct("_id");
  await Promise.all([
    ClientEmployee.deleteMany({ businessClientId: client._id }),
    ClientEmployeeSalaryStructure.deleteMany({ businessClientId: client._id }),
    ClientPayrollRun.deleteMany({ businessClientId: client._id }),
    ClientPayrollEntry.deleteMany({ payrollRunId: { $in: runIds } }),
    ClientPayrollSettings.deleteMany({ businessClientId: client._id }),
    ClientPaymentFile.deleteMany({ businessClientId: client._id }),
  ]);
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
  const tempPassword = usingOwnPassword ? null : generateTempPassword(admin.name);
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

// ── Employee self-onboarding link + employee master (business_client_admin's own view) ──

// Older clients created before this feature existed have no employeeFormToken
// yet — generate one lazily on first access instead of a migration script.
async function loadOwnClientWithFormToken(businessClientId) {
  const client = await BusinessClient.findById(businessClientId);
  if (!client) throw new ApiError(404, "No business client linked to this account");
  if (!client.employeeFormToken) {
    client.employeeFormToken = crypto.randomBytes(16).toString("hex");
    await client.save();
  }
  return client;
}

export const getMyEmployeeForm = catchAsync(async (req, res) => {
  const client = await loadOwnClientWithFormToken(req.user.businessClientId);
  res.json({
    success: true,
    data: {
      token: client.employeeFormToken,
      url: `${process.env.CLIENT_URL}/onboard/${client.employeeFormToken}`,
    },
  });
});

export const listMyEmployees = catchAsync(async (req, res) => {
  const employees = await ClientEmployee.find({ businessClientId: req.user.businessClientId }).sort({ createdAt: -1 });
  res.json({ success: true, data: employees });
});

export const createMyEmployee = catchAsync(async (req, res) => {
  const { name, phone, designation, dateOfJoining, email, costCenter, pan, bankAccountNumber, bankIfsc, bankName, accountHolderName } = req.body;
  const businessClientId = req.user.businessClientId;
  const client = await BusinessClient.findById(businessClientId).select("name");

  const employeeCode = await generateNextEmployeeCode(client.name, name, businessClientId);
  const employee = await ClientEmployee.create({
    businessClientId,
    employeeCode,
    name,
    nameKey: toNameKey(name),
    phone,
    designation,
    dateOfJoining,
    email,
    costCenter,
    pan,
    bankAccountNumber,
    bankIfsc,
    bankName,
    accountHolderName,
    source: "manual",
  });

  res.status(201).json({ success: true, data: employee, message: "Employee added" });
});

export const updateMyEmployee = catchAsync(async (req, res) => {
  const employee = await ClientEmployee.findOne({ _id: req.params.employeeId, businessClientId: req.user.businessClientId });
  if (!employee) throw new ApiError(404, "Employee not found");

  const {
    name,
    phone,
    designation,
    dateOfJoining,
    email,
    costCenter,
    isActive,
    pan,
    bankAccountNumber,
    bankIfsc,
    bankName,
    accountHolderName,
  } = req.body;
  if (name !== undefined) {
    employee.name = name;
    employee.nameKey = toNameKey(name);
  }
  if (phone !== undefined) employee.phone = phone;
  if (designation !== undefined) employee.designation = designation;
  if (dateOfJoining !== undefined) employee.dateOfJoining = dateOfJoining;
  if (email !== undefined) employee.email = email;
  if (costCenter !== undefined) employee.costCenter = costCenter;
  if (isActive !== undefined) employee.isActive = isActive;
  if (pan !== undefined) employee.pan = pan;
  if (bankAccountNumber !== undefined) employee.bankAccountNumber = bankAccountNumber;
  if (bankIfsc !== undefined) employee.bankIfsc = bankIfsc;
  if (bankName !== undefined) employee.bankName = bankName;
  if (accountHolderName !== undefined) employee.accountHolderName = accountHolderName;
  await employee.save();

  res.json({ success: true, data: employee, message: "Employee updated" });
});

// ── CA firm-admin/staff read-only view of one client's employees ──

export const listClientEmployees = catchAsync(async (req, res) => {
  const client = await BusinessClient.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId });
  if (!client) throw new ApiError(404, "Business client not found");
  const employees = await ClientEmployee.find({ businessClientId: client._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: employees });
});

// ── Business Client Admin's own read-only view of their month-wise Salary
// Structure — mirrors clientPayrollController.getStructureForMonth, scoped by
// req.user.businessClientId instead of a caFirmId-checked :id param. View
// only: editing a client's payroll numbers stays CA staff's responsibility.
export const getMySalaryStructureForMonth = catchAsync(async (req, res) => {
  const businessClientId = req.user.businessClientId;
  const month = req.params.month;
  if (!/^\d{4}-\d{2}$/.test(month)) throw new ApiError(400, "Invalid month, expected YYYY-MM");

  const [structures, run] = await Promise.all([
    ClientEmployeeSalaryStructure.find({ businessClientId, month }).sort({ createdAt: 1 }).lean(),
    ClientPayrollRun.findOne({ businessClientId, month }).lean(),
  ]);

  const employeeIds = structures.map((s) => s.clientEmployeeId);
  const employees = await ClientEmployee.find({ _id: { $in: employeeIds } }).lean();
  const employeeById = new Map(employees.map((e) => [String(e._id), e]));

  let netByEmployeeId = new Map();
  if (run && run.status !== "Draft") {
    const entries = await ClientPayrollEntry.find({ payrollRunId: run._id }).lean();
    netByEmployeeId = new Map(entries.map((e) => [String(e.clientEmployeeId), e.net]));
  }

  const data = structures.map((s) => ({
    ...s,
    employee: employeeById.get(String(s.clientEmployeeId)) || null,
    net: netByEmployeeId.get(String(s.clientEmployeeId)) ?? null,
  }));

  res.json({ success: true, data, run: run || null });
});
