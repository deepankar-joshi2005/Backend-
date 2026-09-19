"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cleranceController_1 = require("../../controllers/hrms/cleranceController");
const ClearanceRouter = (0, express_1.Router)();
ClearanceRouter.get("/", cleranceController_1.getAllClearances);
ClearanceRouter.post("/from-resignation/:resignationId", cleranceController_1.createClearanceFromResignation);
ClearanceRouter.patch("/:clearanceId/department", cleranceController_1.updateDepartmentClearance);
exports.default = ClearanceRouter;
