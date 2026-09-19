"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuperAdminDashboard = void 0;
const CaFirm_1 = __importDefault(require("../models/CaFirm"));
const User_1 = __importDefault(require("../models/User"));
const BusinessClient_1 = __importDefault(require("../models/BusinessClient"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
// Matches the Super Admin flow's dashboard step: Active Licences, Revenue
// Summary, System Alerts (licences expiring within 7 days).
exports.getSuperAdminDashboard = (0, catchAsync_1.default)(async (req, res) => {
    const now = new Date();
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [totalFirms, activeLicences, trialFirms, expiredFirms, totalUsers, totalBusinessClients, expiringSoon, recentFirms,] = await Promise.all([
        CaFirm_1.default.countDocuments(),
        CaFirm_1.default.countDocuments({ "plan.status": "active" }),
        CaFirm_1.default.countDocuments({ "plan.status": "trial" }),
        CaFirm_1.default.countDocuments({ "plan.status": { $in: ["expired", "suspended"] } }),
        User_1.default.countDocuments({ role: { $ne: "super_admin" } }),
        BusinessClient_1.default.countDocuments(),
        CaFirm_1.default.find({
            "plan.status": { $in: ["trial", "active"] },
            "plan.expiryDate": { $gte: now, $lte: sevenDaysOut },
        })
            .select("name plan.expiryDate plan.status plan.tier")
            .sort({ "plan.expiryDate": 1 }),
        CaFirm_1.default.find().select("name plan createdAt").sort({ createdAt: -1 }).limit(5),
    ]);
    res.json({
        success: true,
        data: {
            totalFirms,
            activeLicences,
            trialFirms,
            expiredFirms,
            totalUsers,
            totalBusinessClients,
            expiringSoon,
            recentFirms,
        },
    });
});
