import ApiError from "../utils/ApiError";

// Gates CRM/Compliance/Finance-Tracker routes by a ca_firm_staff member's per-module
// permissions (set by their ca_firm_admin on the Staff page). Every other role
// (ca_firm_admin included) is unaffected — this only restricts staff.
export const requireModulePermission = (moduleName, action = null) => {
  return (req, res, next) => {
    if (req.user.role !== "ca_firm_staff") return next();

    const modulePerms = req.currentUser?.permissions?.[moduleName];
    if (!modulePerms?.enabled) {
      return next(new ApiError(403, "You do not have access to this module"));
    }
    if (action && !modulePerms[action]) {
      return next(new ApiError(403, "You do not have permission to perform this action"));
    }
    next();
  };
};
