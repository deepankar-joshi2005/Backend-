/** @format */

import { Request, Response } from "express";
import WorkingDay from "../../models/hrms/WorkingDay";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

/**
 * 🛠️ CREATE OR UPDATE WORKING DAY CONFIG
 */
export const createOrUpdateWorkingDay = async (req: AuthRequest, res: Response) => {
    try {
        if (
            !req.user.isSystemAdmin &&
            req.user.role !== ROLES.HRMSAdmin &&
            req.user.role !== ROLES.SuperAdmin
        ) {
            return res.status(403).json({ message: "Access denied." });
        }

        const { companyId, weeklyOff, officeTiming } = req.body;

        if (!companyId) {
            return res.status(400).json({ message: "Company ID is required" });
        }

        const config = await WorkingDay.findOneAndUpdate(
            { companyId },
            { weeklyOff, officeTiming },
            { new: true, upsert: true }
        );

        res.status(200).json({
            message: "Working Days configuration updated successfully",
            config,
        });
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to update configuration",
            error: error.message,
        });
    }
};

/**
 * 🔍 GET WORKING DAY CONFIG
 */
export const getWorkingDayConfig = async (req: Request, res: Response) => {
    try {
        const { companyId } = req.params;

        // If companyId is not provided in params, try to find the first one or return default
        const config = await WorkingDay.findOne(companyId ? { companyId } : {});

        if (!config) {
            return res.status(404).json({ message: "Configuration not found" });
        }

        res.json(config);
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to fetch configuration",
            error: error.message,
        });
    }
};
