"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingSummary = void 0;
const CaFirm_1 = __importDefault(require("../models/CaFirm"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const getSystemSettings_1 = require("../utils/getSystemSettings");
// Enterprise is "custom" pricing (Multi-Tenancy doc, Section 5) — not counted
// in the estimated recurring revenue total, only in the firm counts.
exports.getBillingSummary = (0, catchAsync_1.default)(async (req, res) => {
    const [firms, settings] = await Promise.all([CaFirm_1.default.find().select("plan"), (0, getSystemSettings_1.getSystemSettings)()]);
    const byTier = { starter: 0, growth: 0, enterprise: 0 };
    const byStatus = { trial: 0, active: 0, suspended: 0, expired: 0 };
    let estimatedMonthlyRevenue = 0;
    for (const firm of firms) {
        byTier[firm.plan.tier] = (byTier[firm.plan.tier] || 0) + 1;
        byStatus[firm.plan.status] = (byStatus[firm.plan.status] || 0) + 1;
        if (firm.plan.status === "active") {
            if (firm.plan.tier === "starter")
                estimatedMonthlyRevenue += settings.starterPrice;
            if (firm.plan.tier === "growth")
                estimatedMonthlyRevenue += settings.growthPrice;
        }
    }
    res.json({
        success: true,
        data: {
            totalFirms: firms.length,
            byTier,
            byStatus,
            estimatedMonthlyRevenue,
            currency: settings.currency,
            pricing: { starter: settings.starterPrice, growth: settings.growthPrice },
        },
    });
});
