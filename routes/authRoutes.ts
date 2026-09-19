import express from "express";
import rateLimit from "express-rate-limit";
import {
  registerFirm,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  updateProfile,
} from "../controllers/authController";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validateRequest";
import {
  registerFirmSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../validators/authValidators";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});

router.post("/register-firm", authLimiter, validate(registerFirmSchema), registerFirm);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/change-password", protect, validate(changePasswordSchema), changePassword);
router.put("/profile", protect, validate(updateProfileSchema), updateProfile);

export default router;
