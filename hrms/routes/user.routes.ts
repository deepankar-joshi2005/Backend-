/** @format */

import { Router } from "express";
import {
  resetPassword,
  createUser,
  getUsers,
  getUserById,
  deleteUser,
  updateUserById,
  uploadProfilePicture,
  changePassword,
  getNextEmployeeId,
} from "../controllers/userController";
import { authMiddleware } from "../middleware/auth";
import { profilePictureUpload } from "../utils/uploadProfilePicture";

const userRouter = Router();

userRouter.use(authMiddleware);

// 🔍 Generate Employee ID Preview
userRouter.get("/generate-employee-id", getNextEmployeeId);

// ➕ Create user (supports multipart/form-data for profile picture)
userRouter.post("/", profilePictureUpload.single("profilePicture"), createUser);

// 📥 Get all users
userRouter.get("/", getUsers);

// 📥 Get single user
userRouter.get("/:id", getUserById);

// ❌ Delete user by ID
userRouter.delete("/:id", deleteUser);

// 🔑 Change password
userRouter.post("/change-password", changePassword);

// 🔑 Reset password
userRouter.post("/reset-password", resetPassword);

// ✏️ Update user
userRouter.patch("/:id", profilePictureUpload.single("profilePicture"), updateUserById);

// 🖼️ Upload/Update profile picture
userRouter.patch("/:id/profile-picture", profilePictureUpload.single("profilePicture"), uploadProfilePicture);

export default userRouter;