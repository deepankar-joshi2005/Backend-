/** @format */

import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  createRequest,
  getMyRequests,
  updateRequest,
  deleteRequest,
  getTeamAttendanceRequests,
  updateAttendanceRequestStatus,
  getAllAttendanceRequests
} from "../../controllers/hrms/attendanceRequestController";

const AttendanceRequestRouter = Router();
AttendanceRequestRouter.use(authMiddleware);

AttendanceRequestRouter.post("/", createRequest);
AttendanceRequestRouter.get("/me", getMyRequests);
AttendanceRequestRouter.put("/:id", updateRequest);
AttendanceRequestRouter.delete("/:id", deleteRequest);
AttendanceRequestRouter.get(
  "/manager",
  authMiddleware,
  getTeamAttendanceRequests
);
AttendanceRequestRouter.get(
  "/all",
  authMiddleware,
  getAllAttendanceRequests
);

AttendanceRequestRouter.patch(
  "/:id/status",
  authMiddleware,
  updateAttendanceRequestStatus
);

export default AttendanceRequestRouter;
