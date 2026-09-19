/** @format */

import { Router } from "express";
import {
  createOnboardingTask,
  getAllOnboardingTasks,
  getMyAssignedTasks,
  updateTaskStatus,
} from "../../controllers/hrms/onboardingTaskController";
import { authMiddleware } from "../../middleware/auth";

const OnboardTaskRouter = Router();

/* HR / ADMIN */
OnboardTaskRouter.post("/", authMiddleware, createOnboardingTask);
OnboardTaskRouter.get("/", authMiddleware, getAllOnboardingTasks);

/* DEPARTMENT HEAD */
OnboardTaskRouter.get("/my", authMiddleware, getMyAssignedTasks);
OnboardTaskRouter.patch("/:id/status", authMiddleware, updateTaskStatus);

export default OnboardTaskRouter;
