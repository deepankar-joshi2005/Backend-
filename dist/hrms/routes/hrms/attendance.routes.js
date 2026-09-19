"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const attendanceController_1 = require("../../controllers/hrms/attendanceController");
const AttendanceRouter = (0, express_1.Router)();
AttendanceRouter.use(auth_1.authMiddleware);
AttendanceRouter.post("/punch-in", attendanceController_1.punchIn);
AttendanceRouter.post("/punch-out", attendanceController_1.punchOut);
AttendanceRouter.get("/team", attendanceController_1.getTeamAttendance);
AttendanceRouter.get("/all", attendanceController_1.getAllAttendance);
AttendanceRouter.post("/break/start", attendanceController_1.startBreak);
AttendanceRouter.post("/break/end", attendanceController_1.endBreak);
AttendanceRouter.get("/me", attendanceController_1.getMyAttendance);
AttendanceRouter.get("/day-detail/:userId/:date", attendanceController_1.getAttendanceDayDetail);
exports.default = AttendanceRouter;
