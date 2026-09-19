"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComplianceDashboard = exports.addTaskNote = exports.deleteTask = exports.updateTask = exports.createTask = exports.listTasks = void 0;
const ComplianceTask_1 = __importDefault(require("../models/ComplianceTask"));
const User_1 = __importDefault(require("../models/User"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const paginate_1 = require("../utils/paginate");
const writeAuditLog_1 = require("../utils/writeAuditLog");
// Per Role Matrix Section 4.3: CA Firm Staff only manage tasks assigned to them;
// CA Firm Admin sees everything in the firm.
function scopeToRole(req, filter) {
    if (req.user.role === "ca_firm_staff")
        filter.assignedTo = req.user.id;
    return filter;
}
async function assertAssignee(caFirmId, assignedTo) {
    if (!assignedTo)
        return;
    const assignee = await User_1.default.findOne({
        _id: assignedTo,
        caFirmId,
        role: { $in: ["ca_firm_admin", "ca_firm_staff"] },
    });
    if (!assignee)
        throw new ApiError_1.default(400, "Assignee must be a member of your firm");
}
exports.listTasks = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, skip } = (0, paginate_1.getPagination)(req.query);
    const filter = scopeToRole(req, { caFirmId: req.user.caFirmId });
    if (req.query.status)
        filter.status = req.query.status;
    if (req.query.category)
        filter.category = req.query.category;
    const [tasks, total] = await Promise.all([
        ComplianceTask_1.default.find(filter)
            .populate("clientId", "name company")
            .populate("assignedTo", "name")
            .sort({ dueDate: 1 })
            .skip(skip)
            .limit(limit),
        ComplianceTask_1.default.countDocuments(filter),
    ]);
    res.json({ success: true, data: tasks, meta: (0, paginate_1.buildMeta)({ page, limit, total }) });
});
exports.createTask = (0, catchAsync_1.default)(async (req, res) => {
    const { title, category, recurrence, dueDate, clientId, assignedTo, documents } = req.body;
    // Role Matrix: "Create/assign compliance tasks — Staff: create for own clients" —
    // staff can only ever create tasks assigned to themselves.
    let finalAssignee = req.user.role === "ca_firm_staff" ? req.user.id : assignedTo || null;
    if (req.user.role === "ca_firm_admin")
        await assertAssignee(req.user.caFirmId, finalAssignee);
    const task = await ComplianceTask_1.default.create({
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
exports.updateTask = (0, catchAsync_1.default)(async (req, res) => {
    const { title, category, recurrence, dueDate, status, clientId, assignedTo, documents } = req.body;
    const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
    const task = await ComplianceTask_1.default.findOne(filter);
    if (!task)
        throw new ApiError_1.default(404, "Compliance task not found");
    if (title !== undefined)
        task.title = title;
    if (category !== undefined)
        task.category = category;
    if (recurrence !== undefined)
        task.recurrence = recurrence;
    if (dueDate !== undefined)
        task.dueDate = dueDate;
    if (status !== undefined)
        task.status = status;
    if (clientId !== undefined)
        task.clientId = clientId;
    if (documents !== undefined)
        task.documents = documents;
    // Reassignment is Admin-only, mirroring CRM's rule.
    if (assignedTo !== undefined && req.user.role === "ca_firm_admin") {
        await assertAssignee(req.user.caFirmId, assignedTo);
        task.assignedTo = assignedTo || null;
    }
    await task.save();
    const populated = await task.populate([{ path: "clientId", select: "name company" }, { path: "assignedTo", select: "name" }]);
    res.json({ success: true, data: populated, message: "Compliance task updated" });
});
// Role Matrix: "Delete tasks: Admin Full, Staff None" — enforced via
// authorize("ca_firm_admin") on the route.
exports.deleteTask = (0, catchAsync_1.default)(async (req, res) => {
    const task = await ComplianceTask_1.default.findOneAndDelete({ _id: req.params.id, caFirmId: req.user.caFirmId });
    if (!task)
        throw new ApiError_1.default(404, "Compliance task not found");
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: "compliance.task_deleted",
        targetType: "ComplianceTask",
        targetId: task._id,
        targetLabel: task.title,
    });
    res.json({ success: true, message: "Compliance task deleted" });
});
exports.addTaskNote = (0, catchAsync_1.default)(async (req, res) => {
    const { text } = req.body;
    const filter = scopeToRole(req, { _id: req.params.id, caFirmId: req.user.caFirmId });
    const task = await ComplianceTask_1.default.findOne(filter);
    if (!task)
        throw new ApiError_1.default(404, "Compliance task not found");
    task.notes.push({ text, createdBy: req.user.id, createdByName: req.currentUser.name });
    await task.save();
    res.status(201).json({ success: true, data: task, message: "Note added" });
});
// Role Matrix: status counts follow the same per-role scoping as the task list, but
// the upcoming/overdue calendar is firm-wide for both Admin and Staff ("View
// compliance calendar/reminders: Admin Full, Staff Full").
exports.getComplianceDashboard = (0, catchAsync_1.default)(async (req, res) => {
    const scopedFilter = scopeToRole(req, { caFirmId: req.user.caFirmId });
    const firmFilter = { caFirmId: req.user.caFirmId };
    const now = new Date();
    const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [byStatus, overdue, dueThisWeek, upcoming] = await Promise.all([
        ComplianceTask_1.default.aggregate([{ $match: scopedFilter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        ComplianceTask_1.default.countDocuments({ ...firmFilter, dueDate: { $lt: now }, status: { $ne: "done" } }),
        ComplianceTask_1.default.countDocuments({ ...firmFilter, dueDate: { $gte: now, $lte: weekOut }, status: { $ne: "done" } }),
        ComplianceTask_1.default.find({ ...firmFilter, status: { $ne: "done" } })
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
