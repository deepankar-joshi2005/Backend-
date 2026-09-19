"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const paginate_1 = require("../utils/paginate");
exports.listAuditLogs = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, skip } = (0, paginate_1.getPagination)(req.query);
    const filter = {};
    if (req.query.action)
        filter.action = { $regex: req.query.action, $options: "i" };
    const [logs, total] = await Promise.all([
        AuditLog_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        AuditLog_1.default.countDocuments(filter),
    ]);
    res.json({ success: true, data: logs, meta: (0, paginate_1.buildMeta)({ page, limit, total }) });
});
