"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jobOpeningController_1 = require("../../controllers/hrms/jobOpeningController");
const auth_1 = require("../../middleware/auth");
const jobOpeningUpload_1 = require("../../utils/jobOpeningUpload");
const jobOpeningRoutes = (0, express_1.Router)();
/**
 * 🔐 Protected HRMS Job Opening Routes
 */
jobOpeningRoutes.use(auth_1.authMiddleware);
/**
 * Base Route: /api/job-openings
 */
jobOpeningRoutes.post("/", jobOpeningUpload_1.uploadJobDocument.single("file"), jobOpeningController_1.addJobOpening); // ➕ Add
jobOpeningRoutes.get("/", jobOpeningController_1.getAllJobOpenings); // 📋 List
jobOpeningRoutes.get("/:id", jobOpeningController_1.getJobOpeningById); // 🔍 Single
jobOpeningRoutes.put("/:id", jobOpeningUpload_1.uploadJobDocument.single("file"), jobOpeningController_1.updateJobOpening); // ✏️ Update
jobOpeningRoutes.patch("/:id/close", jobOpeningController_1.closeJobOpening); // ❌ Close
jobOpeningRoutes.delete("/:id", jobOpeningController_1.deleteJobOpeningById); // 🗑️ Delete
exports.default = jobOpeningRoutes;
