/** @format */

import cron from "node-cron";
import Company from "../models/hrms/Company";

/**
 * 📅 Daily Subscription Expiration Check
 * Runs every day at midnight (00:00)
 */
export const startSubscriptionJobs = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("🕒 Running daily subscription expiration check...");
    
    try {
      const now = new Date();
      
      // 1. Find companies whose trial has expired
      const expiredCompanies = await Company.updateMany(
        {
          subscriptionPlan: "TRIAL",
          trialEndDate: { $lt: now },
        },
        {
          $set: { 
            subscriptionPlan: "EXPIRED",
            subscriptionStatus: "OVERDUE"
          }
        }
      );

      console.log(`✅ Job completed. Expired ${expiredCompanies.modifiedCount} trials.`);

      // 2. Find ACTIVE companies whose next billing date (trialEndDate) has passed
      // In a real system, we'd charge the card here. For now, mark as OVERDUE.
      const overdueCompanies = await Company.updateMany(
        {
          subscriptionPlan: "ACTIVE",
          trialEndDate: { $lt: now },
          subscriptionStatus: "PAID"
        },
        {
          $set: { 
            subscriptionStatus: "OVERDUE"
          }
        }
      );

      if (overdueCompanies.modifiedCount > 0) {
        console.log(`⚠️  Marked ${overdueCompanies.modifiedCount} active subscriptions as OVERDUE.`);
      }

    } catch (error) {
      console.error("❌ Subscription job error:", error);
    }
  });
  
  console.log("🚀 Subscription monitoring jobs registered.");
};
