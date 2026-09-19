/** @format */

import { Router } from "express";
import {
    createLeaveEncashmentRequest,
    getAllLeaveEncashmentRequests,
    getMyLeaveEncashmentRequests,
    updateLeaveEncashmentStatus,
} from "../../controllers/hrms/leaveEncashmentController";
import { authMiddleware } from "../../middleware/auth";

const LeaveEncashmentRouter = Router();

LeaveEncashmentRouter.use(authMiddleware);

LeaveEncashmentRouter.post("/", createLeaveEncashmentRequest);
LeaveEncashmentRouter.get("/", getAllLeaveEncashmentRequests);
LeaveEncashmentRouter.get("/my", getMyLeaveEncashmentRequests);
LeaveEncashmentRouter.put("/:id/status", updateLeaveEncashmentStatus);

export default LeaveEncashmentRouter;
