import User from "../models/User";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { getPagination, buildMeta } from "../utils/paginate";
import { sanitizeUser } from "../utils/sanitizeUser";
import { writeAuditLog } from "../utils/writeAuditLog";

// Platform-wide user directory — Super Admin can see every account across
// every CA firm (name/email/role/status only, never a firm's operational
// data) and toggle access. Per Role Matrix Section 5, this administrative
// visibility is expected of the platform owner even though day-to-day
// tenant data stays off-limits.
export const listUsers = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate("caFirmId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: users.map(sanitizeUser),
    meta: buildMeta({ page, limit, total }),
  });
});

export const toggleUserActive = catchAsync(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  user.isActive = !user.isActive;
  if (!user.isActive) user.tokenVersion += 1;
  await user.save();

  await writeAuditLog(req, {
    action: user.isActive ? "user.activated" : "user.deactivated",
    targetType: "User",
    targetId: user._id,
    targetLabel: user.name,
  });

  res.json({ success: true, data: sanitizeUser(user), message: "User updated" });
});
