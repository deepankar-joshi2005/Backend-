"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const onboardingTaskController_1 = require("../../controllers/hrms/onboardingTaskController");
const auth_1 = require("../../middleware/auth");
const OnboardTaskRouter = (0, express_1.Router)();
/* HR / ADMIN */
OnboardTaskRouter.post("/", auth_1.authMiddleware, onboardingTaskController_1.createOnboardingTask);
OnboardTaskRouter.get("/", auth_1.authMiddleware, onboardingTaskController_1.getAllOnboardingTasks);
/* DEPARTMENT HEAD */
OnboardTaskRouter.get("/my", auth_1.authMiddleware, onboardingTaskController_1.getMyAssignedTasks);
OnboardTaskRouter.patch("/:id/status", auth_1.authMiddleware, onboardingTaskController_1.updateTaskStatus);
exports.default = OnboardTaskRouter;
