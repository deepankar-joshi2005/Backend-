/** @format */

import { Router } from "express";
import {
    createOrUpdateWorkingDay,
    getWorkingDayConfig,
} from "../../controllers/hrms/workingDayController";
import { authMiddleware } from "../../middleware/auth";

const WorkingDayRouter = Router();

WorkingDayRouter.use(authMiddleware);

WorkingDayRouter.post("/", createOrUpdateWorkingDay);
WorkingDayRouter.get("/:companyId", getWorkingDayConfig);
export default WorkingDayRouter;
