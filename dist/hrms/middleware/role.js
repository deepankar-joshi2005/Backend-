"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = void 0;
const checkRole = (role) => {
    return (req, res, next) => {
        // Role checking logic
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Support both single role and array of roles
        const allowedRoles = Array.isArray(role) ? role : [role];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        console.log("✅ Role check passed for role(s):", allowedRoles);
        next();
    };
};
exports.checkRole = checkRole;
