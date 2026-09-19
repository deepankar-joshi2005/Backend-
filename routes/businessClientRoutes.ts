import express from "express";
import {
  getBusinessClientSummary,
  listMyBusinessClients,
  createBusinessClient,
  updateMyBusinessClient,
  deleteBusinessClient,
  resetBusinessClientAdminPassword,
  getMyBusinessClient,
  getMyHrmsSsoToken,
  getBusinessClient,
  getBusinessClientHrmsSsoToken,
  listBusinessClientsForSuperAdmin,
  listPayrollEligibleClients,
  listClientDirectory,
  provisionBusinessClientFromLead,
  upgradeToHrms,
} from "../controllers/businessClientController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { validate } from "../middleware/validateRequest";
import { requireActiveFirm } from "../middleware/requireActiveFirm";
import {
  createBusinessClientSchema,
  updateBusinessClientSchema,
  resetBusinessClientAdminPasswordSchema,
  upgradeToHrmsSchema,
} from "../validators/businessClientValidators";
import clientPayrollRoutes from "./clientPayrollRoutes";
import { getFirmSettings, updateFirmSettings } from "../controllers/clientPayrollController";

const router = express.Router();

router.use(protect);

router.get("/summary", authorize("super_admin"), getBusinessClientSummary);
router.get("/all", authorize("super_admin"), listBusinessClientsForSuperAdmin);

router.get("/me", authorize("business_client_admin", "business_client_employee"), getMyBusinessClient);
router.get(
  "/me/hrms-sso",
  authorize("business_client_admin", "business_client_employee"),
  getMyHrmsSsoToken
);

router.get("/mine", authorize("ca_firm_admin"), listMyBusinessClients);
// Payroll Management module's combined client picker (Business Clients + leads
// never formally onboarded) — admin-only, mirrors listMyBusinessClients above.
router.get("/mine/payroll-clients", authorize("ca_firm_admin"), listPayrollEligibleClients);
// Same combined client list as above, open to staff too — used by features like
// Personal Finance Tracker that aren't payroll-specific.
router.get("/mine/client-directory", authorize("ca_firm_admin", "ca_firm_staff"), listClientDirectory);
router.post("/mine/from-lead/:leadId", authorize("ca_firm_admin"), requireActiveFirm, provisionBusinessClientFromLead);
// Firm-wide Employee ID format + rolling default % — surfaced inside the
// per-client Structure Settings dialog but shared across every client.
router.get("/mine/payroll-firm-settings", authorize("ca_firm_admin", "ca_firm_staff"), getFirmSettings);
router.put("/mine/payroll-firm-settings", authorize("ca_firm_admin", "ca_firm_staff"), requireActiveFirm, updateFirmSettings);
router.put(
  "/mine/:id/upgrade-to-hrms",
  authorize("ca_firm_admin"),
  requireActiveFirm,
  validate(upgradeToHrmsSchema),
  upgradeToHrms
);
// Single-client lookup — needed by pages that only have a clientId in the URL
// (e.g. the Excel payroll page), so staff can access it too (see payroll mount below).
router.get("/mine/:id", authorize("ca_firm_admin", "ca_firm_staff"), getBusinessClient);
router.get(
  "/mine/:id/hrms-sso",
  authorize("ca_firm_admin", "ca_firm_staff"),
  getBusinessClientHrmsSsoToken
);
router.post(
  "/mine",
  authorize("ca_firm_admin"),
  requireActiveFirm,
  validate(createBusinessClientSchema),
  createBusinessClient
);
router.put(
  "/mine/:id",
  authorize("ca_firm_admin"),
  requireActiveFirm,
  validate(updateBusinessClientSchema),
  updateMyBusinessClient
);
router.delete("/mine/:id", authorize("ca_firm_admin"), requireActiveFirm, deleteBusinessClient);
router.put(
  "/mine/:id/reset-admin-password",
  authorize("ca_firm_admin"),
  requireActiveFirm,
  validate(resetBusinessClientAdminPasswordSchema),
  resetBusinessClientAdminPassword
);

// Excel-based payroll for Business Clients that don't use HRMS — see
// clientPayrollController.ts. Staff get access here (unlike the rest of this
// file, which is ca_firm_admin only) since running a client's monthly payroll
// is routine operational work, not client-relationship management.
router.use(
  "/mine/:businessClientId/payroll",
  authorize("ca_firm_admin", "ca_firm_staff"),
  requireActiveFirm,
  clientPayrollRoutes
);

export default router;
