/** @format */

import { Request, Response } from "express";
import ParkingAssignment from "../../models/hrms/ParkingAssignment";

/* ================= CREATE ================= */
export const createParkingAssignment = async (req: Request, res: Response) => {
  try {
    const assignment = await ParkingAssignment.create(req.body);
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Failed to allocate parking", error });
  }
};

/* ================= GET ALL ================= */
export const getParkingAssignments = async (req: Request, res: Response) => {
  try {
    const data = await ParkingAssignment.find()
      .populate("employee", "name role employeeCode")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch data", error });
  }
};

/* ================= GET BY ID ================= */
export const getParkingAssignmentById = async (req: Request, res: Response) => {
  try {
    const assignment = await ParkingAssignment.findById(req.params.id).populate(
      "employee",
      "name role employeeCode"
    );

    if (!assignment)
      return res.status(404).json({ message: "Record not found" });

    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching record", error });
  }
};

/* ================= UPDATE ================= */
export const updateParkingAssignment = async (req: Request, res: Response) => {
  try {
    const updated = await ParkingAssignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("employee", "name role employeeCode");

    if (!updated) return res.status(404).json({ message: "Record not found" });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update", error });
  }
};

/* ================= DELETE ================= */
export const deleteParkingAssignment = async (req: Request, res: Response) => {
  try {
    const deleted = await ParkingAssignment.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ message: "Record not found" });

    res.json({ message: "Parking allocation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete", error });
  }
};
