/** @format */

import { Response } from "express";
import AttendancePolicy from "../../models/hrms/AttendancePolicy";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

/**
 * 🛠️ CREATE OR UPDATE ATTENDANCE POLICY
 */
export const createOrUpdateAttendancePolicy = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (
      !req.user.isSystemAdmin &&
      req.user.role !== ROLES.HRMSAdmin &&
      req.user.role !== ROLES.SuperAdmin
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const { companyId, ...rest } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const policy = await AttendancePolicy.findOneAndUpdate(
      { companyId },
      { ...rest },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: "Attendance policy updated successfully",
      policy,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update attendance policy",
      error: error.message,
    });
  }
};

/**
 * 🔍 GET ATTENDANCE POLICY
 */
export const getAttendancePolicyConfig = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { companyId } = req.params;

    const policy = await AttendancePolicy.findOne(
      companyId ? { companyId } : {}
    );

    if (!policy) {
      return res.status(404).json({ message: "Attendance policy not found" });
    }

    res.json(policy);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch attendance policy",
      error: error.message,
    });
  }
};
