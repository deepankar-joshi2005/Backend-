import Lead from "../models/Lead";
import User from "../models/User";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { getPagination, buildMeta } from "../utils/paginate";
import { writeAuditLog } from "../utils/writeAuditLog";

// Per Role Matrix Section 4.2: CA Firm Staff only ever see leads assigned to them;
// CA Firm Admin sees everything in the firm.
function scopeToRole(req, filter) {
  if (req.user.role === "ca_firm_staff") filter.assignedTo = req.user.id;
  return filter;
}

async function assertAssignee(caFirmId, assignedTo) {
  if (!assignedTo) return;
  const assignee = await User.findOne({
    _id: assignedTo,
    caFirmId,
    role: { $in: ["ca_firm_admin", "ca_firm_staff"] },
  });
  if (!assignee) throw new ApiError(400, "Assignee must be a member of your firm");
}

export const listLeads = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = scopeToRole(req, { caFirmId: req.user.caFirmId });
  if (req.query.status) filter.status = req.query.status;
  else if (req.query.excludeConverted === "true") filter.status = { $ne: "converted" };
  if (req.query.assignedTo && req.user.role === "ca_firm_admin") filter.assignedTo = req.query.assignedTo;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { company: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  res.json({ success: true, data: leads, meta: buildMeta({ page, limit, total }) });
});

export const getLead = catchAsync(async (req, res) => {
  const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
  const lead = await Lead.findOne(filter).populate("assignedTo", "name");
  if (!lead) throw new ApiError(404, "Lead not found");
  res.json({ success: true, data: lead });
});

export const createLead = catchAsync(async (req, res) => {
  const {
    name,
    leadType,
    phone,
    email,
    alternatePhone,
    company,
    businessType,
    industry,
    city,
    interestedServices,
    source,
    assignedTo,
    estimatedValue,
    priority,
    expectedClosingDate,
    description,
  } = req.body;

  // Staff can only ever work leads assigned to themselves; only Admin may hand a
  // lead to someone else.
  let finalAssignee = req.user.role === "ca_firm_staff" ? req.user.id : assignedTo || null;
  if (req.user.role === "ca_firm_admin") await assertAssignee(req.user.caFirmId, finalAssignee);

  const lead = await Lead.create({
    name,
    leadType,
    phone,
    email,
    alternatePhone,
    company,
    businessType: businessType || undefined,
    industry,
    city,
    interestedServices,
    source,
    estimatedValue,
    priority,
    expectedClosingDate,
    description,
    caFirmId: req.user.caFirmId,
    assignedTo: finalAssignee,
    createdBy: req.user.id,
    statusHistory: [{ status: "new", changedBy: req.user.id, changedByName: req.currentUser.name }],
  });

  res.status(201).json({ success: true, data: lead, message: "Lead added" });
});

export const updateLead = catchAsync(async (req, res) => {
  const {
    name,
    leadType,
    phone,
    email,
    alternatePhone,
    company,
    businessType,
    industry,
    city,
    interestedServices,
    source,
    status,
    statusNote,
    assignedTo,
    estimatedValue,
    priority,
    expectedClosingDate,
    followUpDate,
    followUpType,
    followUpNote,
    description,
  } = req.body;
  const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
  const lead = await Lead.findOne(filter);
  if (!lead) throw new ApiError(404, "Lead not found");

  if (name !== undefined) lead.name = name;
  if (leadType !== undefined) lead.leadType = leadType;
  if (phone !== undefined) lead.phone = phone;
  if (email !== undefined) lead.email = email;
  if (alternatePhone !== undefined) lead.alternatePhone = alternatePhone;
  if (company !== undefined) lead.company = company;
  if (businessType !== undefined) lead.businessType = businessType || undefined;
  if (industry !== undefined) lead.industry = industry;
  if (city !== undefined) lead.city = city;
  if (interestedServices !== undefined) lead.interestedServices = interestedServices;
  if (source !== undefined) lead.source = source;
  if (estimatedValue !== undefined) lead.estimatedValue = estimatedValue;
  if (priority !== undefined) lead.priority = priority;
  if (expectedClosingDate !== undefined) lead.expectedClosingDate = expectedClosingDate;
  if (followUpDate !== undefined) lead.followUpDate = followUpDate;
  if (followUpType !== undefined) lead.followUpType = followUpType || undefined;
  if (followUpNote !== undefined) lead.followUpNote = followUpNote;
  if (description !== undefined) lead.description = description;

  // Reassignment is Admin-only (Role Matrix: "Reassign leads between staff: Staff None").
  if (assignedTo !== undefined && req.user.role === "ca_firm_admin") {
    await assertAssignee(req.user.caFirmId, assignedTo);
    lead.assignedTo = assignedTo || null;
  }

  if (status !== undefined && status !== lead.status) {
    lead.status = status;
    lead.statusHistory.push({ status, changedBy: req.user.id, changedByName: req.currentUser.name, note: statusNote });
  }

  await lead.save();
  res.json({ success: true, data: lead, message: "Lead updated" });
});

// Role Matrix: "Delete leads/clients: Admin Full, Staff None" — enforced via
// authorize("ca_firm_admin") on the route, not scoped to assignedTo here.
export const deleteLead = catchAsync(async (req, res) => {
  const existing = await Lead.findOne({ _id: req.params.id, caFirmId: req.user.caFirmId }).select("businessClientId");
  if (existing?.businessClientId) {
    throw new ApiError(409, "This client has a Business Client / HRMS account and can't be deleted. Suspend it from Business Clients instead.");
  }

  const lead = await Lead.findOneAndDelete({ _id: req.params.id, caFirmId: req.user.caFirmId });
  if (!lead) throw new ApiError(404, "Lead not found");

  await writeAuditLog(req, {
    action: "crm.lead_deleted",
    targetType: "Lead",
    targetId: lead._id,
    targetLabel: lead.name,
  });

  res.json({ success: true, message: "Lead deleted" });
});

export const addLeadNote = catchAsync(async (req, res) => {
  const { text } = req.body;
  const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
  const lead = await Lead.findOne(filter);
  if (!lead) throw new ApiError(404, "Lead not found");

  lead.notes.push({ text, createdBy: req.user.id, createdByName: req.currentUser.name });
  await lead.save();

  res.status(201).json({ success: true, data: lead, message: "Note added" });
});

// Role Matrix: "View CRM reports/dashboards: Admin Full, Staff Own performance only."
export const getCrmDashboard = catchAsync(async (req, res) => {
  const baseFilter = scopeToRole(req, { caFirmId: req.user.caFirmId });
  const now = new Date();

  const [byStatus, dueForFollowUp, overdueFollowUp, recentLeads] = await Promise.all([
    Lead.aggregate([{ $match: baseFilter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Lead.countDocuments({
      ...baseFilter,
      followUpDate: { $gte: now, $lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
      status: { $nin: ["converted", "lost"] },
    }),
    Lead.countDocuments({
      ...baseFilter,
      followUpDate: { $lt: now },
      status: { $nin: ["converted", "lost"] },
    }),
    Lead.find(baseFilter).sort({ createdAt: -1 }).limit(5).select("name company status createdAt"),
  ]);

  const pipeline = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
  byStatus.forEach((row) => {
    pipeline[row._id] = row.count;
  });

  res.json({
    success: true,
    data: {
      total: Object.values(pipeline).reduce((sum, n) => sum + n, 0),
      pipeline,
      dueForFollowUp,
      overdueFollowUp,
      recentLeads,
    },
  });
});
