"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendancePolicyConfig = exports.createOrUpdateAttendancePolicy = void 0;
const AttendancePolicy_1 = __importDefault(require("../../models/hrms/AttendancePolicy"));
const constants_1 = require("../../constants");
/**
 * 🛠️ CREATE OR UPDATE ATTENDANCE POLICY
 */
const createOrUpdateAttendancePolicy = async (req, res) => {
    try {
        if (!req.user.isSystemAdmin &&
            req.user.role !== constants_1.ROLES.HRMSAdmin &&
            req.user.role !== constants_1.ROLES.SuperAdmin) {
            return res.status(403).json({ message: "Access denied." });
        }
        const { companyId, ...rest } = req.body;
        if (!companyId) {
            return res.status(400).json({ message: "Company ID is required" });
        }
        const policy = await AttendancePolicy_1.default.findOneAndUpdate({ companyId }, { ...rest }, { new: true, upsert: true });
        res.status(200).json({
            message: "Attendance policy updated successfully",
            policy,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update attendance policy",
            error: error.message,
        });
    }
};
exports.createOrUpdateAttendancePolicy = createOrUpdateAttendancePolicy;
/**
 * 🔍 GET ATTENDANCE POLICY
 */
const getAttendancePolicyConfig = async (req, res) => {
    try {
        const { companyId } = req.params;
        const policy = await AttendancePolicy_1.default.findOne(companyId ? { companyId } : {});
        if (!policy) {
            return res.status(404).json({ message: "Attendance policy not found" });
        }
        res.json(policy);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch attendance policy",
            error: error.message,
        });
    }
};
exports.getAttendancePolicyConfig = getAttendancePolicyConfig;
