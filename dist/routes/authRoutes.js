"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validateRequest_1 = require("../middleware/validateRequest");
const authValidators_1 = require("../validators/authValidators");
const router = express_1.default.Router();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts, please try again later" },
});
router.post("/register-firm", authLimiter, (0, validateRequest_1.validate)(authValidators_1.registerFirmSchema), authController_1.registerFirm);
router.post("/login", authLimiter, (0, validateRequest_1.validate)(authValidators_1.loginSchema), authController_1.login);
router.post("/refresh", authController_1.refresh);
router.post("/logout", authController_1.logout);
router.get("/me", auth_1.protect, authController_1.getMe);
router.put("/change-password", auth_1.protect, (0, validateRequest_1.validate)(authValidators_1.changePasswordSchema), authController_1.changePassword);
router.put("/profile", auth_1.protect, (0, validateRequest_1.validate)(authValidators_1.updateProfileSchema), authController_1.updateProfile);
exports.default = router;
