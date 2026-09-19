"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSubscriptionJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const Company_1 = __importDefault(require("../models/hrms/Company"));
/**
 * 📅 Daily Subscription Expiration Check
 * Runs every day at midnight (00:00)
 */
const startSubscriptionJobs = () => {
    node_cron_1.default.schedule("0 0 * * *", async () => {
        console.log("🕒 Running daily subscription expiration check...");
        try {
            const now = new Date();
            // 1. Find companies whose trial has expired
            const expiredCompanies = await Company_1.default.updateMany({
                subscriptionPlan: "TRIAL",
                trialEndDate: { $lt: now },
            }, {
                $set: {
                    subscriptionPlan: "EXPIRED",
                    subscriptionStatus: "OVERDUE"
                }
            });
            console.log(`✅ Job completed. Expired ${expiredCompanies.modifiedCount} trials.`);
            // 2. Find ACTIVE companies whose next billing date (trialEndDate) has passed
            // In a real system, we'd charge the card here. For now, mark as OVERDUE.
            const overdueCompanies = await Company_1.default.updateMany({
                subscriptionPlan: "ACTIVE",
                trialEndDate: { $lt: now },
                subscriptionStatus: "PAID"
            }, {
                $set: {
                    subscriptionStatus: "OVERDUE"
                }
            });
            if (overdueCompanies.modifiedCount > 0) {
                console.log(`⚠️  Marked ${overdueCompanies.modifiedCount} active subscriptions as OVERDUE.`);
            }
        }
        catch (error) {
            console.error("❌ Subscription job error:", error);
        }
    });
    console.log("🚀 Subscription monitoring jobs registered.");
};
exports.startSubscriptionJobs = startSubscriptionJobs;
