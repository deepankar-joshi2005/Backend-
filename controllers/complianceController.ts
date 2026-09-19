import ComplianceTask from "../models/ComplianceTask";
import User from "../models/User";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { getPagination, buildMeta } from "../utils/paginate";
import { writeAuditLog } from "../utils/writeAuditLog";

// Per Role Matrix Section 4.3: CA Firm Staff only manage tasks assigned to them;
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

export const listTasks = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = scopeToRole(req, { caFirmId: req.user.caFirmId });
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  // Used by the calendar view to pull exactly the visible month (padded to full
  // weeks) instead of relying on the 100-row pagination cap.
  if (req.query.dueFrom || req.query.dueTo) {
    filter.dueDate = {};
    if (req.query.dueFrom) filter.dueDate.$gte = new Date(req.query.dueFrom);
    if (req.query.dueTo) filter.dueDate.$lte = new Date(req.query.dueTo);
  }

  const [tasks, total] = await Promise.all([
    ComplianceTask.find(filter)
      .populate("clientId", "name company")
      .populate("assignedTo", "name")
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit),
    ComplianceTask.countDocuments(filter),
  ]);

  res.json({ success: true, data: tasks, meta: buildMeta({ page, limit, total }) });
});

export const createTask = catchAsync(async (req, res) => {
  const { title, category, recurrence, dueDate, clientId, assignedTo, documents } = req.body;

  // Role Matrix: "Create/assign compliance tasks — Staff: create for own clients" —
  // staff can only ever create tasks assigned to themselves.
  let finalAssignee = req.user.role === "ca_firm_staff" ? req.user.id : assignedTo || null;
  if (req.user.role === "ca_firm_admin") await assertAssignee(req.user.caFirmId, finalAssignee);

  const task = await ComplianceTask.create({
    title,
    category,
    recurrence,
    dueDate,
    clientId,
    assignedTo: finalAssignee,
    documents: documents || [],
    caFirmId: req.user.caFirmId,
    createdBy: req.user.id,
  });

  const populated = await task.populate([{ path: "clientId", select: "name company" }, { path: "assignedTo", select: "name" }]);
  res.status(201).json({ success: true, data: populated, message: "Compliance task added" });
});

export const updateTask = catchAsync(async (req, res) => {
  const { title, category, recurrence, dueDate, status, clientId, assignedTo, documents } = req.body;
  const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
  const task = await ComplianceTask.findOne(filter);
  if (!task) throw new ApiError(404, "Compliance task not found");

  const isAdmin = req.user.role === "ca_firm_admin";

  // Staff only ever move a task along (status) and attach proof (documents) —
  // editing the task's own details or reassigning it is Admin-only (Role Matrix
  // 4.3: staff manage tasks assigned to them, not the task definitions).
  if (isAdmin) {
    if (title !== undefined) task.title = title;
    if (category !== undefined) task.category = category;
    if (recurrence !== undefined) task.recurrence = recurrence;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (clientId !== undefined) task.clientId = clientId;
    if (assignedTo !== undefined) {
      await assertAssignee(req.user.caFirmId, assignedTo);
      task.assignedTo = assignedTo || null;
    }
  }
  if (status !== undefined) task.status = status;
  if (documents !== undefined) task.documents = documents;

  await task.save();
  const populated = await task.populate([{ path: "clientId", select: "name company" }, { path: "assignedTo", select: "name" }]);
  res.json({ success: true, data: populated, message: "Compliance task updated" });
});

// Role Matrix: "Delete tasks: Admin Full, Staff None" — enforced via
// authorize("ca_firm_admin") on the route.
export const deleteTask = catchAsync(async (req, res) => {
  const task = await ComplianceTask.findOneAndDelete({ _id: req.params.id, caFirmId: req.user.caFirmId });
  if (!task) throw new ApiError(404, "Compliance task not found");

  await writeAuditLog(req, {
    action: "compliance.task_deleted",
    targetType: "ComplianceTask",
    targetId: task._id,
    targetLabel: task.title,
  });

  res.json({ success: true, message: "Compliance task deleted" });
});

// Attaches a real file as proof-of-filing to a task's document checklist —
// distinct from the plain manual checklist items, which just track a label/done
// flag with no file. Marked done automatically: having the file already is the
// proof, so there's nothing left to manually tick.
export const uploadTaskDocument = catchAsync(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded");
  const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
  const task = await ComplianceTask.findOne(filter);
  if (!task) throw new ApiError(404, "Compliance task not found");

  const label = req.body.label?.trim() || req.file.originalname;
  task.documents.push({
    label,
    done: true,
    fileUrl: `/uploads/compliance/${req.file.filename}`,
    fileName: req.file.originalname,
    fileSize: req.file.size,
  });
  await task.save();

  const populated = await task.populate([{ path: "clientId", select: "name company" }, { path: "assignedTo", select: "name" }]);
  res.status(201).json({ success: true, data: populated, message: "Document uploaded" });
});

export const addTaskNote = catchAsync(async (req, res) => {
  const { text } = req.body;
  const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
  const task = await ComplianceTask.findOne(filter);
  if (!task) throw new ApiError(404, "Compliance task not found");

  task.notes.push({ text, createdBy: req.user.id, createdByName: req.currentUser.name });
  await task.save();

  res.status(201).json({ success: true, data: task, message: "Note added" });
});

// Role Matrix: status counts follow the same per-role scoping as the task list, but
// the upcoming/overdue calendar is firm-wide for both Admin and Staff ("View
// compliance calendar/reminders: Admin Full, Staff Full").
export const getComplianceDashboard = catchAsync(async (req, res) => {
  const scopedFilter = scopeToRole(req, { caFirmId: req.user.caFirmId });
  const firmFilter = { caFirmId: req.user.caFirmId };
  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [byStatus, overdue, dueThisWeek, upcoming] = await Promise.all([
    ComplianceTask.aggregate([{ $match: scopedFilter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    ComplianceTask.countDocuments({ ...firmFilter, dueDate: { $lt: now }, status: { $ne: "done" } }),
    ComplianceTask.countDocuments({ ...firmFilter, dueDate: { $gte: now, $lte: weekOut }, status: { $ne: "done" } }),
    ComplianceTask.find({ ...firmFilter, status: { $ne: "done" } })
      .populate("clientId", "name company")
      .populate("assignedTo", "name")
      .sort({ dueDate: 1 })
      .limit(8),
  ]);

  const counts = { pending: 0, in_progress: 0, done: 0 };
  byStatus.forEach((row) => {
    counts[row._id] = row.count;
  });

  res.json({
    success: true,
    data: {
      total: Object.values(counts).reduce((sum, n) => sum + n, 0),
      counts,
      overdue,
      dueThisWeek,
      upcoming,
    },
  });
});
