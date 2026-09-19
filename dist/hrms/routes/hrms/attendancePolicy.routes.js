"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendancePolicyController_1 = require("../../controllers/hrms/attendancePolicyController");
const auth_1 = require("../../middleware/auth");
const AttendancePolicyRouter = (0, express_1.Router)();
AttendancePolicyRouter.use(auth_1.authMiddleware);
AttendancePolicyRouter.post("/", attendancePolicyController_1.createOrUpdateAttendancePolicy);
AttendancePolicyRouter.get("/:companyId", attendancePolicyController_1.getAttendancePolicyConfig);
exports.default = AttendancePolicyRouter;
