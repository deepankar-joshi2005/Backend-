"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const leaveController_1 = require("../../controllers/hrms/leaveController");
const LeaveRouter = (0, express_1.Router)();
LeaveRouter.get("/", auth_1.authMiddleware, leaveController_1.getMyLeaves);
LeaveRouter.post("/", auth_1.authMiddleware, leaveController_1.applyLeave);
LeaveRouter.put("/:id", auth_1.authMiddleware, leaveController_1.updateLeave);
LeaveRouter.delete("/:id", auth_1.authMiddleware, leaveController_1.deleteLeave);
LeaveRouter.get("/manager/today", auth_1.authMiddleware, leaveController_1.getTodayTeamLeaves);
LeaveRouter.get("/all", auth_1.authMiddleware, leaveController_1.getAllEmployeesLeaveRequests);
LeaveRouter.get("/manager", auth_1.authMiddleware, leaveController_1.getAllLeaveRequests);
LeaveRouter.patch("/manager/leaves/:id/status", auth_1.authMiddleware, leaveController_1.updateLeaveStatus);
exports.default = LeaveRouter;
