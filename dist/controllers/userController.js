"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleUserActive = exports.listUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const paginate_1 = require("../utils/paginate");
const sanitizeUser_1 = require("../utils/sanitizeUser");
const writeAuditLog_1 = require("../utils/writeAuditLog");
// Platform-wide user directory — Super Admin can see every account across
// every CA firm (name/email/role/status only, never a firm's operational
// data) and toggle access. Per Role Matrix Section 5, this administrative
// visibility is expected of the platform owner even though day-to-day
// tenant data stays off-limits.
exports.listUsers = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, skip } = (0, paginate_1.getPagination)(req.query);
    const filter = {};
    if (req.query.role)
        filter.role = req.query.role;
    if (req.query.search) {
        filter.$or = [
            { name: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
        ];
    }
    const [users, total] = await Promise.all([
        User_1.default.find(filter)
            .populate("caFirmId", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        User_1.default.countDocuments(filter),
    ]);
    res.json({
        success: true,
        data: users.map(sanitizeUser_1.sanitizeUser),
        meta: (0, paginate_1.buildMeta)({ page, limit, total }),
    });
});
exports.toggleUserActive = (0, catchAsync_1.default)(async (req, res) => {
    if (req.params.id === req.user.id) {
        throw new ApiError_1.default(400, "You cannot deactivate your own account");
    }
    const user = await User_1.default.findById(req.params.id);
    if (!user)
        throw new ApiError_1.default(404, "User not found");
    user.isActive = !user.isActive;
    if (!user.isActive)
        user.tokenVersion += 1;
    await user.save();
    await (0, writeAuditLog_1.writeAuditLog)(req, {
        action: user.isActive ? "user.activated" : "user.deactivated",
        targetType: "User",
        targetId: user._id,
        targetLabel: user.name,
    });
    res.json({ success: true, data: (0, sanitizeUser_1.sanitizeUser)(user), message: "User updated" });
});
