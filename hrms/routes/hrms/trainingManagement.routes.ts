/** @format */

import { Router } from "express";
import {
  createModule,
  getModules,
  getModuleById,
  updateModule,
  deactivateModule,
  addMediaToModule,
  removeMediaFromModule,
  updateMediaWatchTime,
  addQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  getTrainees,
  getTraineeDetails,
  updateTraineeModules,
  completeOnboarding,
  resetTraineeAttempts,
} from "../../controllers/hrms/trainingManagementController";
import { checkRole } from "../../middleware/role";
import { trainingUpload } from "../../utils/trainingUpload";

const trainingManagementRouter = Router();

// authMiddleware + subscriptionMiddleware are applied where this router is
// mounted (root.routes.ts), matching every other HRMS route module. These are
// the HR/Admin/SuperAdmin authoring & review endpoints — a trainee is already
// blocked from this whole prefix by middleware/auth.ts's isTrainee gate, but
// this restricts it further to the roles that actually manage training.
const TRAINING_MANAGE_ROLES = ["superadmin", "HRMS-Admin", "hrms-admin", "Admin", "admin", "hr-admin", "HR-Admin"];
trainingManagementRouter.use(checkRole(TRAINING_MANAGE_ROLES));

/* Modules */
trainingManagementRouter.post("/modules", trainingUpload.array("files", 5), createModule);
trainingManagementRouter.get("/modules", getModules);
trainingManagementRouter.get("/modules/:id", getModuleById);
trainingManagementRouter.put("/modules/:id", updateModule);
trainingManagementRouter.delete("/modules/:id", deactivateModule);
trainingManagementRouter.post("/modules/:id/media", trainingUpload.array("files", 5), addMediaToModule);
trainingManagementRouter.delete("/modules/:moduleId/media/:contentId", removeMediaFromModule);
trainingManagementRouter.put("/modules/:moduleId/media/:contentId", updateMediaWatchTime);

/* Question bank */
trainingManagementRouter.post("/modules/:moduleId/questions", addQuestion);
trainingManagementRouter.get("/modules/:moduleId/questions", getQuestions);
trainingManagementRouter.put("/questions/:questionId", updateQuestion);
trainingManagementRouter.delete("/questions/:questionId", deleteQuestion);

/* Trainees */
trainingManagementRouter.get("/trainees", getTrainees);
trainingManagementRouter.get("/trainees/:id", getTraineeDetails);
trainingManagementRouter.put("/trainees/:id/modules", updateTraineeModules);
trainingManagementRouter.post("/trainees/:id/complete-onboarding", completeOnboarding);
trainingManagementRouter.post("/trainees/:id/reset-attempts", resetTraineeAttempts);

export default trainingManagementRouter;
