"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const softwearManagementController_1 = require("../../controllers/hrms/softwearManagementController");
const auth_1 = require("../../middleware/auth");
const SoftwearManagementRouter = (0, express_1.Router)();
/* IT Admin Protected Routes */
SoftwearManagementRouter.post("/assign", auth_1.authMiddleware, softwearManagementController_1.assignSoftware);
SoftwearManagementRouter.get("/assigned", auth_1.authMiddleware, softwearManagementController_1.getAssignedSoftware);
SoftwearManagementRouter.patch("/revoke/:id", auth_1.authMiddleware, softwearManagementController_1.revokeSoftware);
exports.default = SoftwearManagementRouter;
