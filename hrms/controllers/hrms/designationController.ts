/** @format */

import { Request, Response } from "express";
import Designation from "../../models/hrms/Designation";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

export const createDesignation = async (req: AuthRequest, res: Response) => {
  try {
    const designation = await Designation.create({
      ...req.body,
      companyId: (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId,
    });
    res.status(201).json(designation);
  } catch (err: any) {
    res.status(400).json({ message: "Create failed", error: err.message });
  }
};

export const getDesignations = async (req: AuthRequest, res: Response) => {
  const { companyId, departmentId } = req.query;

  const filter: any = {};
  if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
    filter.companyId = req.user.companyId;
  } else if (companyId) {
    filter.companyId = companyId;
  }
  
  if (departmentId) filter.departmentId = departmentId;

  const data = await Designation.find(filter)
    .populate("companyId", "name")
    .populate("departmentId", "name")
    .sort({ createdAt: -1 });

  res.json(data);
};

export const getDesignationById = async (req: Request, res: Response) => {
  const data = await Designation.findById(req.params.id)
    .populate("companyId", "name")
    .populate("departmentId", "name");

  res.json(data);
};

export const updateDesignation = async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.departmentId === "") {
      data.departmentId = null;
    }
    const updated = await Designation.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: "Update failed", error: err.message });
  }
};

export const deleteDesignation = async (req: Request, res: Response) => {
  await Designation.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted successfully" });
};
