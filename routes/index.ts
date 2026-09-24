import express from "express";
import authRoutes from "./authRoutes";
import caFirmRoutes from "./caFirmRoutes";
import settingsRoutes from "./settingsRoutes";
import billingRoutes from "./billingRoutes";
import dashboardRoutes from "./dashboardRoutes";
import auditLogRoutes from "./auditLogRoutes";
import notificationRoutes from "./notificationRoutes";
import supportTicketRoutes from "./supportTicketRoutes";
import userRoutes from "./userRoutes";
import businessClientRoutes from "./businessClientRoutes";
import publicBusinessClientRoutes from "./publicBusinessClientRoutes";
import staffRoutes from "./staffRoutes";
import crmRoutes from "./crmRoutes";
import complianceRoutes from "./complianceRoutes";
import hrmsPlanTierRoutes from "./hrmsPlanTierRoutes";
import financeTrackerRoutes from "./financeTrackerRoutes";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

router.use("/auth", authRoutes);
router.use("/ca-firms", caFirmRoutes);
router.use("/settings", settingsRoutes);
router.use("/billing", billingRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/notifications", notificationRoutes);
router.use("/support-tickets", supportTicketRoutes);
router.use("/users", userRoutes);
router.use("/business-clients", businessClientRoutes);
router.use("/public/business-clients", publicBusinessClientRoutes);
router.use("/staff", staffRoutes);
router.use("/crm", crmRoutes);
router.use("/compliance", complianceRoutes);
router.use("/hrms-plan-tiers", hrmsPlanTierRoutes);
router.use("/finance-tracker", financeTrackerRoutes);

export default router;
