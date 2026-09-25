/** @format */

import { Router } from "express";
import {
  getMyDashboard,
  getModuleLearningView,
  markContentCompleted,
  getModuleTestInfo,
  startTest,
  submitTest,
} from "../../controllers/hrms/myTrainingController";

const myTrainingRouter = Router();

// authMiddleware + subscriptionMiddleware are applied where this router is
// mounted (root.routes.ts). Any authenticated user can hit these — each
// handler scopes strictly to req.user._id, and this is also the one prefix
// the trainee access gate in middleware/auth.ts always allows through.
myTrainingRouter.get("/dashboard", getMyDashboard);
myTrainingRouter.get("/module/:moduleId", getModuleLearningView);
myTrainingRouter.post("/module/mark-content-completed", markContentCompleted);
myTrainingRouter.get("/module/:moduleId/test-info", getModuleTestInfo);
myTrainingRouter.post("/module/:moduleId/start-test", startTest);
myTrainingRouter.post("/module/submit-test", submitTest);

export default myTrainingRouter;
