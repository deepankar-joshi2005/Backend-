"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const dataManagementController_1 = require("../controllers/dataManagementController");
const role_1 = require("../middleware/role");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: "uploads/" });
// authMiddleware + subscriptionMiddleware are applied where this router is
// mounted (root.routes.ts), matching every other HRMS route module.
const READ_ROLES = ["superadmin", "HRMS-Admin", "hrms-admin", "Admin"];
const DELETE_ROLES = ["superadmin", "HRMS-Admin", "hrms-admin"];
// Get list of supported modules
router.get("/modules", (0, role_1.checkRole)(READ_ROLES), dataManagementController_1.getModules);
// Sample Download
router.get("/sample-download", (0, role_1.checkRole)(READ_ROLES), dataManagementController_1.downloadSample);
// Export Data (returns CSV)
router.get("/export", (0, role_1.checkRole)(READ_ROLES), dataManagementController_1.exportData);
// Import Data (expects file upload)
router.post("/import", (0, role_1.checkRole)(READ_ROLES), upload.single("file"), dataManagementController_1.importData);
// Hard Delete (Compliance) — most privileged roles only
router.delete("/hard-delete", (0, role_1.checkRole)(DELETE_ROLES), dataManagementController_1.hardDelete);
exports.default = router;
