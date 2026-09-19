import AuditLog from "../models/AuditLog";
import catchAsync from "../utils/catchAsync";
import { getPagination, buildMeta } from "../utils/paginate";

export const listAuditLogs = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.action) filter.action = { $regex: req.query.action, $options: "i" };

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: logs, meta: buildMeta({ page, limit, total }) });
});
