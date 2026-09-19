"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const attendanceRequestController_1 = require("../../controllers/hrms/attendanceRequestController");
const AttendanceRequestRouter = (0, express_1.Router)();
AttendanceRequestRouter.use(auth_1.authMiddleware);
AttendanceRequestRouter.post("/", attendanceRequestController_1.createRequest);
AttendanceRequestRouter.get("/me", attendanceRequestController_1.getMyRequests);
AttendanceRequestRouter.put("/:id", attendanceRequestController_1.updateRequest);
AttendanceRequestRouter.delete("/:id", attendanceRequestController_1.deleteRequest);
AttendanceRequestRouter.get("/manager", auth_1.authMiddleware, attendanceRequestController_1.getTeamAttendanceRequests);
AttendanceRequestRouter.get("/all", auth_1.authMiddleware, attendanceRequestController_1.getAllAttendanceRequests);
AttendanceRequestRouter.patch("/:id/status", auth_1.authMiddleware, attendanceRequestController_1.updateAttendanceRequestStatus);
exports.default = AttendanceRequestRouter;
