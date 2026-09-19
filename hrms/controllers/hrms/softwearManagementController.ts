/** @format */

import { Request, Response } from "express";
import SoftwareAssignment from "../../models/hrms/SoftwearManagement";

/* ---------------- ASSIGN SOFTWARE ---------------- */
export const assignSoftware = async (req: Request, res: Response) => {
  try {
    const { userId, software, licenseKey, expiryDate, remarks } = req.body;

    if (!userId || !software) {
      return res.status(400).json({
        message: "User and Software are required",
      });
    }

    const assignment = await SoftwareAssignment.create({
      user: userId,
      software,
      licenseKey,
      expiryDate,
      remarks,
    });

    res.status(201).json({
      message: "Software assigned successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* ---------------- GET ALL ASSIGNED SOFTWARE ---------------- */
export const getAssignedSoftware = async (_req: Request, res: Response) => {
  try {
    const assignments = await SoftwareAssignment.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* ---------------- REVOKE SOFTWARE ---------------- */
export const revokeSoftware = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await SoftwareAssignment.findByIdAndUpdate(
      id,
      { status: "REVOKED" },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json({
      message: "Software revoked successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
