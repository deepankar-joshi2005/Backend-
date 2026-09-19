"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaveTypeController_1 = require("../../controllers/hrms/leaveTypeController");
const auth_1 = require("../../middleware/auth");
const LeaveTypeRouter = (0, express_1.Router)();
LeaveTypeRouter.post("/", auth_1.authMiddleware, leaveTypeController_1.addLeaveType);
LeaveTypeRouter.get("/", auth_1.authMiddleware, leaveTypeController_1.getAllLeaveTypes);
LeaveTypeRouter.get("/:id", auth_1.authMiddleware, leaveTypeController_1.getLeaveTypeById);
LeaveTypeRouter.put("/:id", auth_1.authMiddleware, leaveTypeController_1.updateLeaveType);
LeaveTypeRouter.delete("/:id", auth_1.authMiddleware, leaveTypeController_1.deleteLeaveTypeById);
exports.default = LeaveTypeRouter;
