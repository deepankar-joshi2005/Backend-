/** @format */

import { Request, Response } from "express";
import Branch from "../../models/hrms/Branch";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

/**
 * CREATE BRANCH
 */
export const createBranch = async (req: AuthRequest, res: Response) => {
  try {
    const branch = await Branch.create({
      ...req.body,
      companyId: (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId,
      createdBy: req.user.id,
    });

    res.status(201).json(branch);
  } catch (error: any) {
    res.status(400).json({
      message: "Failed to create branch",
      error: error.message,
    });
  }
};

/**
 * GET ALL BRANCHES
 */
export const getAllBranches = async (req: AuthRequest, res: Response) => {
  try {
    let query = {};
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
      query = { companyId: req.user.companyId };
    }

    const branches = await Branch.find(query)
      .populate("companyId", "name")
      .sort({ createdAt: -1 });

    const formatted = branches.map((b) => ({
      ...b.toObject(),
      companyName: (b.companyId as any)?.name,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch branches",
      error: error.message,
    });
  }
};

/**
 * GET BRANCH BY ID
 */
export const getBranchById = async (req: Request, res: Response) => {
  try {
    const branch = await Branch.findById(req.params.id).populate(
      "companyId",
      "name"
    );

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    res.json(branch);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch branch",
      error: error.message,
    });
  }
};

/**
 * UPDATE BRANCH
 */
export const updateBranch = async (req: Request, res: Response) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    res.json(branch);
  } catch (error: any) {
    res.status(400).json({
      message: "Failed to update branch",
      error: error.message,
    });
  }
};

/**
 * DELETE BRANCH
 */
export const deleteBranch = async (req: Request, res: Response) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    res.json({ message: "Branch deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete branch",
      error: error.message,
    });
  }
};
