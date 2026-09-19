/** @format */

import { Request, Response } from "express";
import Workstation from "../../models/hrms/Workstation";

/* ================= ALLOCATE DESK ================= */
export const allocateDesk = async (req: Request, res: Response) => {
  try {
    const { employeeId, location, building, floor, deskCode, seatType } =
      req.body;

    // Desk already allocated?
    const existingDesk = await Workstation.findOne({
      deskCode,
      status: "ALLOCATED",
    });

    if (existingDesk) {
      return res.status(400).json({
        message: "Desk already allocated",
      });
    }

    // Employee already has desk?
    const employeeDesk = await Workstation.findOne({
      employee: employeeId,
      status: "ALLOCATED",
    });

    if (employeeDesk) {
      return res.status(400).json({
        message: "Employee already has an allocated desk",
      });
    }

    const workstation = await Workstation.create({
      employee: employeeId,
      location,
      building,
      floor,
      deskCode,
      seatType,
    });

    res.status(201).json({
      message: "Desk allocated successfully",
      data: workstation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= GET ALL ALLOCATIONS ================= */
export const getAllWorkstations = async (req: Request, res: Response) => {
  try {
    const data = await Workstation.find()
      .populate("employee", "name role email departmentId")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= RELEASE DESK ================= */
export const releaseDesk = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const workstation = await Workstation.findById(id);

    if (!workstation) {
      return res.status(404).json({
        message: "Workstation not found",
      });
    }

    workstation.status = "RELEASED";
    workstation.releasedAt = new Date();

    await workstation.save();

    res.json({
      message: "Desk released successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
/* ================= UPDATE WORKSTATION STATUS ================= */
export const updateWorkstationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["ALLOCATED", "RELEASED"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const workstation = await Workstation.findById(id);

    if (!workstation) {
      return res.status(404).json({
        message: "Workstation not found",
      });
    }

    // If already released
    if (workstation.status === "RELEASED" && status === "RELEASED") {
      return res.status(400).json({
        message: "Desk already released",
      });
    }

    workstation.status = status;

    // Set releasedAt only when deallocating
    if (status === "RELEASED") {
      workstation.releasedAt = new Date();
    } else {
      workstation.releasedAt = undefined;
    }

    await workstation.save();

    res.json({
      message: "Status updated successfully",
      data: workstation,
    });
  } catch (error) {
    console.error("UPDATE WORKSTATION STATUS ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
