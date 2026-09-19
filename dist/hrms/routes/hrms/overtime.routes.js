"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const overtimeController_1 = require("../../controllers/hrms/overtimeController");
const auth_1 = require("../../middleware/auth");
const OvertimeRouter = (0, express_1.Router)();
/* Employee Overtime */
OvertimeRouter.post("/", auth_1.authMiddleware, overtimeController_1.createOvertime);
OvertimeRouter.get("/my-requests", auth_1.authMiddleware, overtimeController_1.getMyOvertimeRequests);
OvertimeRouter.get("/team-requests", auth_1.authMiddleware, overtimeController_1.getTeamOvertimeRequests);
OvertimeRouter.patch("/:id", auth_1.authMiddleware, overtimeController_1.updateOvertime);
OvertimeRouter.delete("/:id", auth_1.authMiddleware, overtimeController_1.deleteOvertime);
exports.default = OvertimeRouter;
