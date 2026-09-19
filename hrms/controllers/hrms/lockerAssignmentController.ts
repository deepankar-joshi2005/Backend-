/** @format */
import { Request, Response } from "express";
import LockerAssignment from "../../models/hrms/LockerAssignment";

/* ================= CREATE / ALLOCATE ================= */
export const allocateLocker = async (req: Request, res: Response) => {
  try {
    const { employee, type, code, location, floor } = req.body;

    if (!employee || !type || !code || !location || !floor) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existing = await LockerAssignment.findOne({ code });
    if (existing) {
      return res.status(409).json({
        message: "Locker / Cabin already allocated",
      });
    }

    const assignment = await LockerAssignment.create({
      employee,
      type,
      code,
      location,
      floor,
      status: "ALLOCATED",
    });

    res.status(201).json({
      message: "Locker/Cabin allocated successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to allocate locker/cabin",
      error,
    });
  }
};

/* ================= GET ALL ================= */
export const getAllAssignments = async (_: Request, res: Response) => {
  try {
    const data = await LockerAssignment.find()
      .populate("employee", "name role employeeCode")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch assignments",
      error,
    });
  }
};

/* ================= UPDATE ================= */
export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, code, location, floor } = req.body;

    const assignment = await LockerAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    assignment.type = type ?? assignment.type;
    assignment.code = code ?? assignment.code;
    assignment.location = location ?? assignment.location;
    assignment.floor = floor ?? assignment.floor;

    await assignment.save();

    res.json({
      message: "Assignment updated successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update assignment",
      error,
    });
  }
};

/* ================= VACATE ================= */
export const vacateAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await LockerAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    assignment.status = "VACATED";
    assignment.vacatedAt = new Date();

    await assignment.save();

    res.json({
      message: "Locker/Cabin vacated successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to vacate locker/cabin",
      error,
    });
  }
};

/* ================= DELETE ================= */
export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await LockerAssignment.findByIdAndDelete(id);
    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    res.json({
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete assignment",
      error,
    });
  }
};
