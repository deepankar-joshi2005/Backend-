"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicketStatus = exports.replyToTicket = exports.getTicket = exports.listTickets = exports.createTicket = void 0;
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const paginate_1 = require("../utils/paginate");
const createNotification_1 = require("../utils/createNotification");
function scopedFilter(req, extra = {}) {
    if (req.user.role === "super_admin")
        return extra;
    return { ...extra, caFirmId: req.user.caFirmId };
}
exports.createTicket = (0, catchAsync_1.default)(async (req, res) => {
    const { subject, message, priority } = req.body;
    const ticket = await SupportTicket_1.default.create({
        caFirmId: req.user.caFirmId,
        raisedBy: req.user.id,
        subject,
        priority: priority || "medium",
        status: "open",
        messages: [
            {
                from: req.user.id,
                fromName: req.currentUser.name,
                fromRole: req.user.role,
                text: message,
            },
        ],
    });
    await (0, createNotification_1.createNotification)({
        title: "New support ticket",
        message: `${req.currentUser.name} raised: "${subject}"`,
        type: "ticket",
        scope: "super_admin",
    });
    res.status(201).json({ success: true, data: ticket, message: "Ticket submitted" });
});
exports.listTickets = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, skip } = (0, paginate_1.getPagination)(req.query);
    const filter = scopedFilter(req);
    if (req.query.status)
        filter.status = req.query.status;
    const [tickets, total] = await Promise.all([
        SupportTicket_1.default.find(filter)
            .populate("caFirmId", "name")
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit),
        SupportTicket_1.default.countDocuments(filter),
    ]);
    res.json({ success: true, data: tickets, meta: (0, paginate_1.buildMeta)({ page, limit, total }) });
});
exports.getTicket = (0, catchAsync_1.default)(async (req, res) => {
    const ticket = await SupportTicket_1.default.findOne(scopedFilter(req, { _id: req.params.id })).populate("caFirmId", "name");
    if (!ticket)
        throw new ApiError_1.default(404, "Ticket not found");
    res.json({ success: true, data: ticket });
});
exports.replyToTicket = (0, catchAsync_1.default)(async (req, res) => {
    const { text } = req.body;
    const ticket = await SupportTicket_1.default.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!ticket)
        throw new ApiError_1.default(404, "Ticket not found");
    ticket.messages.push({
        from: req.user.id,
        fromName: req.currentUser.name,
        fromRole: req.user.role,
        text,
    });
    if (req.user.role === "super_admin" && ticket.status === "open") {
        ticket.status = "in_progress";
    }
    await ticket.save();
    await (0, createNotification_1.createNotification)({
        title: "Support ticket update",
        message: `New reply on "${ticket.subject}"`,
        type: "ticket",
        scope: req.user.role === "super_admin" ? "firm" : "super_admin",
        caFirmId: req.user.role === "super_admin" ? ticket.caFirmId : null,
        role: req.user.role === "super_admin" ? "ca_firm_admin" : null,
        createdBy: req.user.id,
    });
    res.json({ success: true, data: ticket, message: "Reply added" });
});
exports.updateTicketStatus = (0, catchAsync_1.default)(async (req, res) => {
    const { status } = req.body;
    const ticket = await SupportTicket_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket)
        throw new ApiError_1.default(404, "Ticket not found");
    res.json({ success: true, data: ticket, message: "Ticket status updated" });
});
