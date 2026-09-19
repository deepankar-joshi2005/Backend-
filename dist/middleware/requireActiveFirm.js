"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireActiveFirm = void 0;
const CaFirm_1 = __importDefault(require("../models/CaFirm"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
// Blocks Tier-2 (CA Firm Admin/Staff) write access once their firm is suspended or
// its subscription has expired. Tier 3 (business client) users are never gated here —
// their HRMS access must survive the parent firm's lapse (Multi-Tenancy & Licensing
// doc, Section 7). Apply this to every CRM/Compliance/Loan Calculator route as those
// modules are built; login and read-only status checks (e.g. /ca-firms/my-plan) must
// stay outside this gate so a locked-out admin can still see *why* they're locked out.
exports.requireActiveFirm = (0, catchAsync_1.default)(async (req, res, next) => {
    if (!["ca_firm_admin", "ca_firm_staff"].includes(req.user.role))
        return next();
    const firm = await CaFirm_1.default.findById(req.user.caFirmId).select("isActive plan.status");
    if (!firm)
        throw new ApiError_1.default(404, "CA firm not found");
    if (!firm.isActive) {
        throw new ApiError_1.default(403, "Your firm's account has been suspended. Contact the platform administrator.");
    }
    if (["expired", "suspended"].includes(firm.plan.status)) {
        throw new ApiError_1.default(403, "Your firm's subscription has ended. Renew your plan to continue.");
    }
    next();
});
