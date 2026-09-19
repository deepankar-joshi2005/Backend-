"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user)
            return next(new ApiError_1.default(401, "Not authenticated"));
        if (!roles.includes(req.user.role)) {
            return next(new ApiError_1.default(403, "You do not have permission to perform this action"));
        }
        next();
    };
};
exports.authorize = authorize;
