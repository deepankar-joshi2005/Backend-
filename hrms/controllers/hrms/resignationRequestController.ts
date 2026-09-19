/** @format */

import { Request, Response } from "express";
import ResignationRequest from "../../models/hrms/ResignationRequest";
import { AuthRequest } from "../../middleware/auth";
import Clearance from "../../models/hrms/Clearance";
import { createClearanceFromResignation } from "./cleranceController";
import User from "../../models/User";
import { CommonEmailType, sendCommonEmail } from "../../utils/email";
import { ROLES } from "../../constants";
/* ---------------- CREATE ---------------- */
export const createResignation = async (req: AuthRequest, res: Response) => {
  try {
    const {
      resignationType,
      reasonCategory,
      reasonText,
      expectedLastWorkingDay,
      documents,
    } = req.body;

    const resignation = await ResignationRequest.create({
      employee: req.user.id, // authMiddleware se
      resignationType,
      reasonCategory,
      reasonText,
      expectedLastWorkingDay,
      documents,
      companyId: req.user.companyId, // Set companyId
    });

    res.status(201).json({
      message: "Resignation request submitted",
      data: resignation,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* ---------------- GET (EMPLOYEE) ---------------- */
export const getMyResignations = async (req: AuthRequest, res: Response) => {
  try {
    const data = await ResignationRequest.find({
      employee: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* ---------------- UPDATE ---------------- */
export const updateResignation = async (req: AuthRequest, res: Response) => {
  try {
    const resignation = await ResignationRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        employee: req.user.id,
        status: "PENDING",
      },
      req.body,
      { new: true }
    );

    if (!resignation) {
      return res.status(404).json({
        message: "Resignation not found or already processed",
      });
    }

    res.json({
      message: "Resignation updated",
      data: resignation,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* ---------------- DELETE ---------------- */
export const deleteResignation = async (req: AuthRequest, res: Response) => {
  try {
    const resignation = await ResignationRequest.findOneAndDelete({
      _id: req.params.id,
      employee: req.user.id,
      status: "PENDING",
    });

    if (!resignation) {
      return res.status(404).json({
        message: "Resignation not found or already processed",
      });
    }

    res.json({ message: "Resignation deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* ---------------- ADMIN / HR UPDATE STATUS ---------------- */
export const updateResignationStatus = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { status } = req.body;

    const existingResignation = await ResignationRequest.findById(req.params.id);
    if (!existingResignation) {
      return res.status(404).json({ message: "Resignation not found" });
    }

    // Multi-tenancy check
    if (req.user.role !== ROLES.HRMSAdmin && existingResignation.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    const resignation = await ResignationRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!resignation) {
      return res.status(404).json({ message: "Resignation not found" });
    }

    // 🔹 Get user details
    const user = await User.findById(resignation.employee);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔥 AUTO CREATE CLEARANCE
    if (status === "APPROVED") {
      const exists = await Clearance.findOne({ resignation: resignation._id });
      if (!exists) {
        await createClearanceFromResignation(resignation);
      }

      // 📧 EMAIL — APPROVED
      await sendCommonEmail({
        type: CommonEmailType.RESIGNATION_APPROVED,
        to: user.email,
        name: user.name,
      });

      // 👤 DEACTIVATE USER
      user.status = "INACTIVE";
      await user.save();
    }

    if (status === "REJECTED") {
      // 📧 EMAIL — REJECTED
      await sendCommonEmail({
        type: CommonEmailType.RESIGNATION_REJECTED,
        to: user.email,
        name: user.name,
      });
    }

    res.json({
      message: "Resignation status updated",
      data: resignation,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};


export const getAllResignations = async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "15", search = "" } = req.query;
    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    let filter: any = {};
    if (req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    }

    if (search) {
      const users = await User.find({
        name: { $regex: search, $options: "i" },
        ...(req.user.role !== ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
      }).select("_id");
      const userIds = users.map((u) => u._id);
      filter.employee = { $in: userIds };
    }

    const [data, totalRecords] = await Promise.all([
      ResignationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: "employee",
          select: "name role departmentId employeeId",
          populate: {
            path: "departmentId",
            select: "name",
          },
        }),
      ResignationRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
