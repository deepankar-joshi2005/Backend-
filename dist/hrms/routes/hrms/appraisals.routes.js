"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appraisalsController_1 = require("../../controllers/hrms/appraisalsController");
const auth_1 = require("../../middleware/auth");
const AppraisalsRouter = (0, express_1.Router)();
/* HR / ADMIN */
AppraisalsRouter.post("/", auth_1.authMiddleware, appraisalsController_1.createAppraisal);
AppraisalsRouter.get("/", auth_1.authMiddleware, appraisalsController_1.getAppraisals);
AppraisalsRouter.get("/:id", auth_1.authMiddleware, appraisalsController_1.getAppraisalById);
AppraisalsRouter.put("/:id", auth_1.authMiddleware, appraisalsController_1.updateAppraisal);
AppraisalsRouter.delete("/:id", auth_1.authMiddleware, appraisalsController_1.deleteAppraisal);
exports.default = AppraisalsRouter;
