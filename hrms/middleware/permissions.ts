import { Request, Response, NextFunction } from "express";
import { PERMISSIONS, ROLES } from "../constants";

// Middleware to check if user has specific permission
export const requirePermission = (permission: keyof typeof PERMISSIONS) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user from auth middleware
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // If user is super admin, allow all permissions
      if (user.role === ROLES.SuperAdmin) {
        return next();
      }

      // Check if user has the required permission in their permissions array
      if (!user.permissions?.includes(PERMISSIONS[permission])) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permission}`,
        });
      }

      return next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};

// Helper function to check multiple permissions
export const requireAnyPermission = (
  permissions: (keyof typeof PERMISSIONS)[]
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // If user is super admin, allow all permissions
      if (user.role === ROLES.SuperAdmin) {
        return next();
      }

      // Check if user has any of the required permissions
      const hasPermission = permissions.some((permission) => {
        return user.permissions?.includes(PERMISSIONS[permission]);
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required one of: ${permissions.join(", ")}`,
        });
      }

      return next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};

// Export permission constants for easy access
export { PERMISSIONS };
