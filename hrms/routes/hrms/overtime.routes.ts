/** @format */

import { Router } from "express";
import {
  createOvertime,
  getMyOvertimeRequests,
  updateOvertime,
  deleteOvertime,
  getTeamOvertimeRequests,
} from "../../controllers/hrms/overtimeController";
import { authMiddleware } from "../../middleware/auth";

const OvertimeRouter = Router();

/* Employee Overtime */
OvertimeRouter.post("/", authMiddleware, createOvertime);
OvertimeRouter.get("/my-requests", authMiddleware, getMyOvertimeRequests);
OvertimeRouter.get("/team-requests",authMiddleware,getTeamOvertimeRequests);
OvertimeRouter.patch("/:id", authMiddleware, updateOvertime);
OvertimeRouter.delete("/:id", authMiddleware, deleteOvertime);

export default OvertimeRouter;
