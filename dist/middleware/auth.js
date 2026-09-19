"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const User_1 = __importDefault(require("../models/User"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const generateToken_1 = require("../utils/generateToken");
exports.protect = (0, catchAsync_1.default)(async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
        throw new ApiError_1.default(401, "Not authenticated");
    let payload;
    try {
        payload = (0, generateToken_1.verifyAccessToken)(token);
    }
    catch {
        throw new ApiError_1.default(401, "Invalid or expired token");
    }
    const user = await User_1.default.findById(payload.sub);
    if (!user || !user.isActive)
        throw new ApiError_1.default(401, "Account not found or disabled");
    if (user.tokenVersion !== payload.tokenVersion) {
        throw new ApiError_1.default(401, "Session expired, please log in again");
    }
    req.user = {
        id: user._id.toString(),
        role: user.role,
        caFirmId: user.caFirmId ? user.caFirmId.toString() : null,
        businessClientId: user.businessClientId ? user.businessClientId.toString() : null,
    };
    req.currentUser = user;
    next();
});
