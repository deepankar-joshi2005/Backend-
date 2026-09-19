"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
const activityLogger_1 = require("./activityLogger");
const authMiddleware = async (req, res, next) => {
    const header = req.headers["authorization"];
    if (!header)
        return res.status(401).json({ message: "No token provided" });
    const token = header.split(" ")[1];
    if (!token)
        return res.status(401).json({ message: "Invalid token format" });
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        // Check if user exists in the database
        const user = await User_1.default.findById(decoded.id);
        if (!user)
            return res.status(401).json({ message: "User not found" });
        // Check if user is active based on their role
        let isActive = true;
        if (user.status !== "ACTIVE") {
            isActive = false;
        }
        if (!isActive) {
            return res.status(403).json({
                message: "Your account has been deactivated. Please contact your administrator.",
                isAccountDeactivated: true,
            });
        }
        // Set req.user to the actual user document from database
        req.user = user;
        console.log("✅ Auth check passed for user:", user.email);
        // Apply activity logging middleware after authentication
        (0, activityLogger_1.activityLogger)(req, res, next);
    }
    catch {
        return res.status(401).json({ message: "Token invalid or expired" });
    }
};
exports.authMiddleware = authMiddleware;
