"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const saasController = __importStar(require("../controllers/saasController"));
const auth_1 = require("../middleware/auth");
const companyLogoUpload_1 = require("../utils/companyLogoUpload");
const router = (0, express_1.Router)();
/**
 * @route POST /api/saas/register
 * @desc Register a new company and its super admin
 * @access Public
 */
router.post("/register", companyLogoUpload_1.companyLogoUpload.single("logo"), saasController.registerCompany);
/**
 * @route POST /api/saas/provision-from-ca
 * @desc Internal — CA-Management calls this when a CA Firm Admin onboards a Business Client
 * @access Server-to-server only (shared-secret header, checked inside the controller)
 */
router.post("/provision-from-ca", saasController.provisionFromCa);
/**
 * @route POST /api/saas/sso-token
 * @desc Internal — mints an HRMS login token for a CA-Management-authenticated user
 * @access Server-to-server only (shared-secret header, checked inside the controller)
 */
router.post("/sso-token", saasController.issueSsoToken);
/**
 * @route POST /api/saas/verify-login
 * @desc Internal — CA-Management's login falls back to this for emails it doesn't recognize
 * @access Server-to-server only (shared-secret header, checked inside the controller)
 */
router.post("/verify-login", saasController.verifyLoginForCa);
// 💳 Razorpay Payment Routes
router.post("/create-order", auth_1.authMiddleware, saasController.createRazorpayOrder);
router.post("/verify-payment", auth_1.authMiddleware, saasController.verifyRazorpayPayment);
router.post("/webhook", saasController.razorpayWebhook); // Razorpay handles signature check inside
router.post("/activate", saasController.activateSubscription);
router.get("/history/:companyId", auth_1.authMiddleware, saasController.getPaymentHistory);
router.get("/invoice/:paymentId", auth_1.authMiddleware, saasController.downloadInvoice);
router.get("/admin/billing-overview", auth_1.authMiddleware, saasController.getAdminBillingOverview);
exports.default = router;
