/** @format */

import { Router } from "express";
import {
    generateStatutoryReport,
    getStatutoryReports,
} from "../../controllers/hrms/statutoryReportController";

import { authMiddleware } from "../../middleware/auth";
const StatutoryReportRouter = Router();

StatutoryReportRouter.use(authMiddleware);

StatutoryReportRouter.post("/generate", generateStatutoryReport);
StatutoryReportRouter.get("/", getStatutoryReports);

export default StatutoryReportRouter;
