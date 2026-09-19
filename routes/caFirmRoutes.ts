import express from "express";
import {
  listCaFirms,
  createCaFirm,
  getCaFirm,
  updateCaFirm,
  deleteCaFirm,
  updateSubscription,
  getMyFirm,
  updateMyFirm,
  resetFirmAdminPassword,
  getMyFirmPlan,
  getPlanCatalog,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getSubscriptionPaymentHistory,
} from "../controllers/caFirmController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { validate } from "../middleware/validateRequest";
import { requireActiveFirm } from "../middleware/requireActiveFirm";
import {
  createCaFirmSchema,
  updateCaFirmSchema,
  updateSubscriptionSchema,
  createSubscriptionOrderSchema,
  verifySubscriptionPaymentSchema,
  resetAdminPasswordSchema,
} from "../validators/caFirmValidators";

const router = express.Router();

router.use(protect);

router.get("/me", authorize("ca_firm_admin"), getMyFirm);
router.put("/me", authorize("ca_firm_admin"), requireActiveFirm, validate(updateCaFirmSchema), updateMyFirm);
router.get("/my-plan", getMyFirmPlan);
router.get("/plans", authorize("ca_firm_admin", "ca_firm_staff"), getPlanCatalog);
router.post(
  "/me/subscription/create-order",
  authorize("ca_firm_admin"),
  validate(createSubscriptionOrderSchema),
  createSubscriptionOrder
);
router.post(
  "/me/subscription/verify-payment",
  authorize("ca_firm_admin"),
  validate(verifySubscriptionPaymentSchema),
  verifySubscriptionPayment
);
router.get("/me/subscription/history", authorize("ca_firm_admin"), getSubscriptionPaymentHistory);

router.get("/", authorize("super_admin"), listCaFirms);
router.post("/", authorize("super_admin"), validate(createCaFirmSchema), createCaFirm);
router.get("/:id", authorize("super_admin"), getCaFirm);
router.put("/:id", authorize("super_admin"), validate(updateCaFirmSchema), updateCaFirm);
router.delete("/:id", authorize("super_admin"), deleteCaFirm);
router.put("/:id/subscription", authorize("super_admin"), validate(updateSubscriptionSchema), updateSubscription);
router.put(
  "/:id/reset-admin-password",
  authorize("super_admin"),
  validate(resetAdminPasswordSchema),
  resetFirmAdminPassword
);

export default router;
