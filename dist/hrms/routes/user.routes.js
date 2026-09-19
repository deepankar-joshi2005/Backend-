"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const uploadProfilePicture_1 = require("../utils/uploadProfilePicture");
const userRouter = (0, express_1.Router)();
userRouter.use(auth_1.authMiddleware);
// 🔍 Generate Employee ID Preview
userRouter.get("/generate-employee-id", userController_1.getNextEmployeeId);
// ➕ Create user (supports multipart/form-data for profile picture)
userRouter.post("/", uploadProfilePicture_1.profilePictureUpload.single("profilePicture"), userController_1.createUser);
// 📥 Get all users
userRouter.get("/", userController_1.getUsers);
// 📥 Get single user
userRouter.get("/:id", userController_1.getUserById);
// ❌ Delete user by ID
userRouter.delete("/:id", userController_1.deleteUser);
// 🔑 Change password
userRouter.post("/change-password", userController_1.changePassword);
// 🔑 Reset password
userRouter.post("/reset-password", userController_1.resetPassword);
// ✏️ Update user
userRouter.patch("/:id", uploadProfilePicture_1.profilePictureUpload.single("profilePicture"), userController_1.updateUserById);
// 🖼️ Upload/Update profile picture
userRouter.patch("/:id/profile-picture", uploadProfilePicture_1.profilePictureUpload.single("profilePicture"), userController_1.uploadProfilePicture);
exports.default = userRouter;
