import SupportTicket from "../models/SupportTicket";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { getPagination, buildMeta } from "../utils/paginate";
import { createNotification } from "../utils/createNotification";

function scopedFilter(req, extra = {}) {
  if (req.user.role === "super_admin") return extra;
  return { ...extra, caFirmId: req.user.caFirmId };
}

export const createTicket = catchAsync(async (req, res) => {
  const { subject, message, priority } = req.body;

  const ticket = await SupportTicket.create({
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

  await createNotification({
    title: "New support ticket",
    message: `${req.currentUser.name} raised: "${subject}"`,
    type: "ticket",
    scope: "super_admin",
  });

  res.status(201).json({ success: true, data: ticket, message: "Ticket submitted" });
});

export const listTickets = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = scopedFilter(req);
  if (req.query.status) filter.status = req.query.status;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .populate("caFirmId", "name")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    SupportTicket.countDocuments(filter),
  ]);

  res.json({ success: true, data: tickets, meta: buildMeta({ page, limit, total }) });
});

export const getTicket = catchAsync(async (req, res) => {
  const ticket = await SupportTicket.findOne(scopedFilter(req, { _id: req.params.id })).populate(
    "caFirmId",
    "name"
  );
  if (!ticket) throw new ApiError(404, "Ticket not found");
  res.json({ success: true, data: ticket });
});

export const replyToTicket = catchAsync(async (req, res) => {
  const { text } = req.body;
  const ticket = await SupportTicket.findOne(scopedFilter(req, { _id: req.params.id }));
  if (!ticket) throw new ApiError(404, "Ticket not found");

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

  await createNotification({
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

export const updateTicketStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  res.json({ success: true, data: ticket, message: "Ticket status updated" });
});
