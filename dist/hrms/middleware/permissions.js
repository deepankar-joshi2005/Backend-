"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = exports.requireAnyPermission = exports.requirePermission = void 0;
const constants_1 = require("../constants");
Object.defineProperty(exports, "PERMISSIONS", { enumerable: true, get: function () { return constants_1.PERMISSIONS; } });
// Middleware to check if user has specific permission
const requirePermission = (permission) => {
    return async (req, res, next) => {
        var _a;
        try {
            // Get user from auth middleware
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }
            // If user is super admin, allow all permissions
            if (user.role === constants_1.ROLES.SuperAdmin) {
                return next();
            }
            // Check if user has the required permission in their permissions array
            if (!((_a = user.permissions) === null || _a === void 0 ? void 0 : _a.includes(constants_1.PERMISSIONS[permission]))) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required permission: ${permission}`,
                });
            }
            return next();
        }
        catch (error) {
            console.error("Permission middleware error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    };
};
exports.requirePermission = requirePermission;
// Helper function to check multiple permissions
const requireAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }
            // If user is super admin, allow all permissions
            if (user.role === constants_1.ROLES.SuperAdmin) {
                return next();
            }
            // Check if user has any of the required permissions
            const hasPermission = permissions.some((permission) => {
                var _a;
                return (_a = user.permissions) === null || _a === void 0 ? void 0 : _a.includes(constants_1.PERMISSIONS[permission]);
            });
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required one of: ${permissions.join(", ")}`,
                });
            }
            return next();
        }
        catch (error) {
            console.error("Permission middleware error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    };
};
exports.requireAnyPermission = requireAnyPermission;
