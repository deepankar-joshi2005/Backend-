import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import User from "../models/User";
import { ROLES } from "../constants";
import { activityLogger } from "./activityLogger";

export interface AuthRequest extends Request {
  user?: any;
  file?: any;
}

// The CA-proxy user (see internalBridge.ts issueCaProxySsoToken) is only meant
// to let CA Firm Admin/Staff view/run Payroll on a Business Client's behalf —
// it must NEVER reach any other HRMS data (employees, leave, documents,
// letters, assets, recruitment, ...). Path-substring allowlist checked below,
// independent of exact mount prefixes, plus /auth (so the SSO landing page's
// own /auth/me call — which authMiddleware also guards — isn't blocked).
const CA_PROXY_ALLOWED_PATH_SEGMENTS = ["/auth", "/payroll", "/salary-structure", "/payslip", "/statutory-report"];

function isAllowedForCaProxy(req: Request): boolean {
  const path = req.originalUrl.split("?")[0].toLowerCase();
  if (CA_PROXY_ALLOWED_PATH_SEGMENTS.some((seg) => path.includes(seg))) return true;
  // Read-only company info (e.g. the Salary Structure page's company filter
  // dropdown) is harmless; creating/editing/deleting companies is not.
  if (path.includes("/companies") && req.method === "GET") return true;
  return false;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token format" });

  try {
    const decoded = verifyToken(token);

    // Check if user exists in the database
    const user = await User.findById((decoded as any).id as string);
    if (!user) return res.status(401).json({ message: "User not found" });

    // Check if user is active based on their role
    let isActive = true;

    if (user.status !== "ACTIVE") {
      isActive = false;
    }

    if (!isActive) {
      return res.status(403).json({
        message:
          "Your account has been deactivated. Please contact your administrator.",
        isAccountDeactivated: true,
      });
    }

    // Set req.user to the actual user document from database
    req.user = user;

    if (user.isCaProxy && !isAllowedForCaProxy(req)) {
      return res.status(403).json({
        message: "This CA-linked session only has access to Payroll.",
        isCaProxyRestricted: true,
      });
    }

    console.log("✅ Auth check passed for user:", user.email);

    // Apply activity logging middleware after authentication
    activityLogger(req, res, next);
  } catch {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};
