"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const selfAppraisalsController_1 = require("../../controllers/hrms/selfAppraisalsController");
const auth_1 = require("../../middleware/auth");
const SelfApprisalsRouter = (0, express_1.Router)();
SelfApprisalsRouter.get("/:appraisalId", auth_1.authMiddleware, selfAppraisalsController_1.getMySelfAppraisal);
SelfApprisalsRouter.post("/", auth_1.authMiddleware, selfAppraisalsController_1.submitSelfAppraisal);
SelfApprisalsRouter.get("/", auth_1.authMiddleware, selfAppraisalsController_1.getEmployeeAppraisals);
exports.default = SelfApprisalsRouter;
