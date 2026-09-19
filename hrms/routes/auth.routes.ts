import express, { Router } from "express";
import {
  login,
  googleAuth,
  googleCallback,
  getCurrentUser,
  forgotPassword,
  resetPasswordWithToken,
} from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";

const authRouter = express.Router();

// Basic Auth
authRouter.post("/login", login);

// Google OAuth
authRouter.get("/google", googleAuth);
authRouter.get("/google/callback", googleCallback);

// Password Management
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPasswordWithToken);


// Get current user info (protected)
authRouter.get("/me", authMiddleware, getCurrentUser);

export default authRouter;
