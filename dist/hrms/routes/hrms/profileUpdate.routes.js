"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileUpdateController_1 = require("../../controllers/hrms/profileUpdateController");
const auth_1 = require("../../middleware/auth");
const ProfileUpdateRouter = (0, express_1.Router)();
/* EMPLOYEE ROUTES */
ProfileUpdateRouter.get("/my-requests", auth_1.authMiddleware, profileUpdateController_1.getMyProfileUpdates);
ProfileUpdateRouter.get("/team-requests", auth_1.authMiddleware, profileUpdateController_1.getTeamProfileUpdateRequests);
ProfileUpdateRouter.post("/", auth_1.authMiddleware, profileUpdateController_1.createProfileUpdate);
ProfileUpdateRouter.patch("/:id", auth_1.authMiddleware, profileUpdateController_1.updateProfileUpdate);
ProfileUpdateRouter.delete("/:id", auth_1.authMiddleware, profileUpdateController_1.deleteProfileUpdate);
exports.default = ProfileUpdateRouter;
