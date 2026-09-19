/** @format */

import { Router } from "express";
import {
  createProfileUpdate,
  getMyProfileUpdates,
  updateProfileUpdate,
  deleteProfileUpdate,
  getTeamProfileUpdateRequests,
} from "../../controllers/hrms/profileUpdateController";
import { authMiddleware } from "../../middleware/auth";

const ProfileUpdateRouter = Router();

/* EMPLOYEE ROUTES */
ProfileUpdateRouter.get("/my-requests", authMiddleware, getMyProfileUpdates);
ProfileUpdateRouter.get("/team-requests", authMiddleware, getTeamProfileUpdateRequests);
ProfileUpdateRouter.post("/", authMiddleware, createProfileUpdate);
ProfileUpdateRouter.patch("/:id", authMiddleware, updateProfileUpdate);
ProfileUpdateRouter.delete("/:id", authMiddleware, deleteProfileUpdate);

export default ProfileUpdateRouter;
