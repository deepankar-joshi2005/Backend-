/** @format */

import express from "express";
import multer from "multer";
import { getModules, exportData, importData, hardDelete, downloadSample } from "../controllers/dataManagementController";
import { checkRole } from "../middleware/role";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// authMiddleware + subscriptionMiddleware are applied where this router is
// mounted (root.routes.ts), matching every other HRMS route module.
const READ_ROLES = ["superadmin", "HRMS-Admin", "hrms-admin", "Admin"];
const DELETE_ROLES = ["superadmin", "HRMS-Admin", "hrms-admin"];

// Get list of supported modules
router.get("/modules", checkRole(READ_ROLES), getModules);

// Sample Download
router.get("/sample-download", checkRole(READ_ROLES), downloadSample);

// Export Data (returns CSV)
router.get("/export", checkRole(READ_ROLES), exportData);

// Import Data (expects file upload)
router.post("/import", checkRole(READ_ROLES), upload.single("file"), importData);

// Hard Delete (Compliance) — most privileged roles only
router.delete("/hard-delete", checkRole(DELETE_ROLES), hardDelete);

export default router;
