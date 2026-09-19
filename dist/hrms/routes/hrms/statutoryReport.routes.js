"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const statutoryReportController_1 = require("../../controllers/hrms/statutoryReportController");
const auth_1 = require("../../middleware/auth");
const StatutoryReportRouter = (0, express_1.Router)();
StatutoryReportRouter.use(auth_1.authMiddleware);
StatutoryReportRouter.post("/generate", statutoryReportController_1.generateStatutoryReport);
StatutoryReportRouter.get("/", statutoryReportController_1.getStatutoryReports);
exports.default = StatutoryReportRouter;
