"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkingDayConfig = exports.createOrUpdateWorkingDay = void 0;
const WorkingDay_1 = __importDefault(require("../../models/hrms/WorkingDay"));
const constants_1 = require("../../constants");
/**
 * 🛠️ CREATE OR UPDATE WORKING DAY CONFIG
 */
const createOrUpdateWorkingDay = async (req, res) => {
    try {
        if (!req.user.isSystemAdmin &&
            req.user.role !== constants_1.ROLES.HRMSAdmin &&
            req.user.role !== constants_1.ROLES.SuperAdmin) {
            return res.status(403).json({ message: "Access denied." });
        }
        const { companyId, weeklyOff, officeTiming } = req.body;
        if (!companyId) {
            return res.status(400).json({ message: "Company ID is required" });
        }
        const config = await WorkingDay_1.default.findOneAndUpdate({ companyId }, { weeklyOff, officeTiming }, { new: true, upsert: true });
        res.status(200).json({
            message: "Working Days configuration updated successfully",
            config,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update configuration",
            error: error.message,
        });
    }
};
exports.createOrUpdateWorkingDay = createOrUpdateWorkingDay;
/**
 * 🔍 GET WORKING DAY CONFIG
 */
const getWorkingDayConfig = async (req, res) => {
    try {
        const { companyId } = req.params;
        // If companyId is not provided in params, try to find the first one or return default
        const config = await WorkingDay_1.default.findOne(companyId ? { companyId } : {});
        if (!config) {
            return res.status(404).json({ message: "Configuration not found" });
        }
        res.json(config);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch configuration",
            error: error.message,
        });
    }
};
exports.getWorkingDayConfig = getWorkingDayConfig;
