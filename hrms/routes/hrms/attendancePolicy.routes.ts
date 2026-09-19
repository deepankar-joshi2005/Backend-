/** @format */

import { Router } from "express";
import {
  createOrUpdateAttendancePolicy,
  getAttendancePolicyConfig,
} from "../../controllers/hrms/attendancePolicyController";
import { authMiddleware } from "../../middleware/auth";

const AttendancePolicyRouter = Router();

AttendancePolicyRouter.use(authMiddleware);

AttendancePolicyRouter.post("/", createOrUpdateAttendancePolicy);
AttendancePolicyRouter.get("/:companyId", getAttendancePolicyConfig);

export default AttendancePolicyRouter;
