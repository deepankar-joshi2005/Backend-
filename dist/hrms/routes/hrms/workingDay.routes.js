"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workingDayController_1 = require("../../controllers/hrms/workingDayController");
const auth_1 = require("../../middleware/auth");
const WorkingDayRouter = (0, express_1.Router)();
WorkingDayRouter.use(auth_1.authMiddleware);
WorkingDayRouter.post("/", workingDayController_1.createOrUpdateWorkingDay);
WorkingDayRouter.get("/:companyId", workingDayController_1.getWorkingDayConfig);
exports.default = WorkingDayRouter;
