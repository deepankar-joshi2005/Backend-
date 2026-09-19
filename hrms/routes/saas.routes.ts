import { Router } from "express";
import * as saasController from "../controllers/saasController";
import { authMiddleware } from "../middleware/auth";

import { companyLogoUpload } from "../utils/companyLogoUpload";

const router = Router();

/**
 * @route POST /api/saas/register
 * @desc Register a new company and its super admin
 * @access Public
 */
router.post("/register", companyLogoUpload.single("logo"), saasController.registerCompany);

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
router.post("/create-order", authMiddleware, saasController.createRazorpayOrder);
router.post("/verify-payment", authMiddleware, saasController.verifyRazorpayPayment);
router.post("/webhook", saasController.razorpayWebhook); // Razorpay handles signature check inside

router.post("/activate", saasController.activateSubscription);
router.get("/history/:companyId", authMiddleware, saasController.getPaymentHistory);
router.get("/invoice/:paymentId", authMiddleware, saasController.downloadInvoice);
router.get("/admin/billing-overview", authMiddleware, saasController.getAdminBillingOverview);

// 📦 Tier-based plans (Business Client HRMS plans, by employee count) — see
// CA-Backend/models/HrmsPlanTier.ts. Separate from the metered flow above.
router.get("/plan-tiers", authMiddleware, saasController.listPlanTiersForCompany);
router.post("/tier/create-order", authMiddleware, saasController.createTierOrder);
router.post("/tier/verify-payment", authMiddleware, saasController.verifyTierPayment);

export default router;
