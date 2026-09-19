"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const authRouter = express_1.default.Router();
// Basic Auth
authRouter.post("/login", authController_1.login);
// Google OAuth
authRouter.get("/google", authController_1.googleAuth);
authRouter.get("/google/callback", authController_1.googleCallback);
// Password Management
authRouter.post("/forgot-password", authController_1.forgotPassword);
authRouter.post("/reset-password", authController_1.resetPasswordWithToken);
// Get current user info (protected)
authRouter.get("/me", auth_1.authMiddleware, authController_1.getCurrentUser);
exports.default = authRouter;
