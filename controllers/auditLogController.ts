import AuditLog from "../models/AuditLog";
import catchAsync from "../utils/catchAsync";
import { getPagination, buildMeta, getDateRangeFilter } from "../utils/paginate";

export const listAuditLogs = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { ...getDateRangeFilter(req.query, "createdAt") };
  if (req.query.action) filter.action = { $regex: req.query.action, $options: "i" };
  if (req.query.search) {
    filter.$or = [
      { actorName: { $regex: req.query.search, $options: "i" } },
      { targetLabel: { $regex: req.query.search, $options: "i" } },
      { action: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: logs, meta: buildMeta({ page, limit, total }) });
});
