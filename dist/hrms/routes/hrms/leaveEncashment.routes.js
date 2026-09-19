"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaveEncashmentController_1 = require("../../controllers/hrms/leaveEncashmentController");
const auth_1 = require("../../middleware/auth");
const LeaveEncashmentRouter = (0, express_1.Router)();
LeaveEncashmentRouter.use(auth_1.authMiddleware);
LeaveEncashmentRouter.post("/", leaveEncashmentController_1.createLeaveEncashmentRequest);
LeaveEncashmentRouter.get("/", leaveEncashmentController_1.getAllLeaveEncashmentRequests);
LeaveEncashmentRouter.get("/my", leaveEncashmentController_1.getMyLeaveEncashmentRequests);
LeaveEncashmentRouter.put("/:id/status", leaveEncashmentController_1.updateLeaveEncashmentStatus);
exports.default = LeaveEncashmentRouter;
