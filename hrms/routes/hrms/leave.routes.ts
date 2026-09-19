/** @format */

import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  applyLeave,
  getMyLeaves,
  updateLeave,
  deleteLeave,
  getTodayTeamLeaves,
  getAllLeaveRequests,
  updateLeaveStatus,
  getAllEmployeesLeaveRequests
} from "../../controllers/hrms/leaveController";

const LeaveRouter = Router();

LeaveRouter.get("/", authMiddleware, getMyLeaves);
LeaveRouter.post("/", authMiddleware, applyLeave);
LeaveRouter.put("/:id", authMiddleware, updateLeave);
LeaveRouter.delete("/:id", authMiddleware, deleteLeave);
LeaveRouter.get("/manager/today", authMiddleware, getTodayTeamLeaves);
LeaveRouter.get(
  "/all",
  authMiddleware,
  getAllEmployeesLeaveRequests
);
LeaveRouter.get("/manager", authMiddleware, getAllLeaveRequests);

LeaveRouter.patch(
  "/manager/leaves/:id/status",
  authMiddleware,
  updateLeaveStatus
);
export default LeaveRouter;
