/** @format */

import { Request, Response } from "express";
import LeaveType from "../../models/hrms/LeaveType";

/**
 * ➕ Add Leave Type
 */
export const addLeaveType = async (req: Request, res: Response) => {
  console.log("🔥 APPLY LEAVE TYPE CONTROLLER HIT 🔥");
  try {
    const { name, code, maxDays, paid, carryForward } = req.body;

    if (!name || !code || maxDays === undefined) {
      return res.status(400).json({
        message: "Name, code and max days are required",
      });
    }

    const existing = await LeaveType.findOne({ code });

    if (existing) {
      return res.status(400).json({
        message: "Leave type with this code already exists",
      });
    }

    const leaveType = await LeaveType.create({
      name,
      code,
      maxDays,
      paid,
      carryForward,
    });

    res.status(201).json({
      message: "Leave type added successfully",
      leaveType,
    });
  } catch (error: any) {
    console.error("Add leave type error:", error);
    res.status(500).json({
      message: "Failed to add leave type",
      error: error.message,
    });
  }
};

/**
 * 📋 Get All Leave Types
 */
export const getAllLeaveTypes = async (_req: Request, res: Response) => {
  try {
    const leaveTypes = await LeaveType.find().sort({ createdAt: -1 });
    res.json(leaveTypes);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch leave types",
      error: error.message,
    });
  }
};

/**
 * 🔍 Get Leave Type By ID
 */
export const getLeaveTypeById = async (req: Request, res: Response) => {
  try {
    const leaveType = await LeaveType.findById(req.params.id);

    if (!leaveType) {
      return res.status(404).json({
        message: "Leave type not found",
      });
    }

    res.json(leaveType);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch leave type",
      error: error.message,
    });
  }
};

/**
 * ✏️ Update Leave Type
 */
export const updateLeaveType = async (req: Request, res: Response) => {
  try {
    const { name, code, maxDays, paid, carryForward } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code;
    if (maxDays !== undefined) updateData.maxDays = maxDays;
    if (paid !== undefined) updateData.paid = paid;
    if (carryForward !== undefined) updateData.carryForward = carryForward;

    const leaveType = await LeaveType.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!leaveType) {
      return res.status(404).json({
        message: "Leave type not found",
      });
    }

    res.json({
      message: "Leave type updated successfully",
      leaveType,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update leave type",
      error: error.message,
    });
  }
};

/**
 * 🗑️ Delete Leave Type
 */
export const deleteLeaveTypeById = async (req: Request, res: Response) => {
  try {
    const leaveType = await LeaveType.findByIdAndDelete(req.params.id);

    if (!leaveType) {
      return res.status(404).json({
        message: "Leave type not found",
      });
    }

    res.json({
      message: "Leave type deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete leave type",
      error: error.message,
    });
  }
};
