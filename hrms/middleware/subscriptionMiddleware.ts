/** @format */

import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import Company from "../models/hrms/Company";

/**
 * 💳 Subscription Middleware
 * Checks if the user's company has an active trial or paid subscription.
 */
export const subscriptionMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || !req.user.companyId) {
      return next();
    }

    // Skip check for System Admins (who manage the technical side)
    if (req.user.isSystemAdmin) {
      return next();
    }

    // ⭐ Bypass Check for Billing Info: 
    // Allow users to view their own company details even if expired (required for the Billing Dashboard)
    if (req.method === "GET" && req.originalUrl.includes(`/companies/${req.user.companyId}`)) {
      return next();
    }

    const company = await Company.findById(req.user.companyId);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const now = new Date();

    // 1. Check if Subscription is ACTIVE
    if (company.subscriptionPlan === "ACTIVE") {
      if (company.subscriptionEndDate && now <= company.subscriptionEndDate) {
        return next();
      } else {
        // Subscription expired
        company.subscriptionPlan = "EXPIRED";
        company.subscriptionStatus = "OVERDUE";
        await company.save();
      }
    }

    // 2. Check if Trial is still valid (Handles TRIAL/TRAIL typo)
    const currentPlan = (company.subscriptionPlan as string).toUpperCase();
    if (currentPlan === "TRIAL" || currentPlan === "TRAIL") {
      if (now <= company.trialEndDate) {
        return next();
      } else {
        // Trial just expired
        company.subscriptionPlan = "EXPIRED";
        await company.save();
      }
    }

    // 3. Subscription or Trial Expired
    return res.status(403).json({
      message: "Your trial or subscription has expired. Please upgrade to continue using HRMS.",
      isSubscriptionExpired: true,
      trialEndDate: company.trialEndDate,
      subscriptionEndDate: company.subscriptionEndDate,
    });

  } catch (error: any) {
    console.error("Subscription check error:", error);
    return res.status(500).json({ message: "Internal server error during subscription check" });
  }
};
