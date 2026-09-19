/** @format */

import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  punchIn,
  punchOut,
  startBreak,
  endBreak,
  getMyAttendance,
  getTeamAttendance,
  getAllAttendance,
  getAttendanceDayDetail
} from "../../controllers/hrms/attendanceController";

const AttendanceRouter = Router();

AttendanceRouter.use(authMiddleware);

AttendanceRouter.post("/punch-in", punchIn);
AttendanceRouter.post("/punch-out", punchOut);
AttendanceRouter.get("/team", getTeamAttendance);
AttendanceRouter.get("/all", getAllAttendance);
AttendanceRouter.post("/break/start", startBreak);
AttendanceRouter.post("/break/end", endBreak);

AttendanceRouter.get("/me", getMyAttendance);
AttendanceRouter.get("/day-detail/:userId/:date", getAttendanceDayDetail);

export default AttendanceRouter;
