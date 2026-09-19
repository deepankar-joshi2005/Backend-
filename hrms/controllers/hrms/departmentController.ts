/** @format */

import { Request, Response } from "express";
import Department from "../../models/hrms/Department";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

/* CREATE */
export const createDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const departmentData = {
      ...req.body,
      companyId: (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId,
    };
    const department = await Department.create(departmentData);
    res.status(201).json(department);
  } catch (error: any) {
    res.status(400).json({
      message: "Failed to create department",
      error: error.message,
    });
  }
};

/* GET ALL */
export const getDepartments = async (req: AuthRequest, res: Response) => {
  let query: any = {};
  if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
    query.companyId = req.user.companyId;
  } else if (req.query.companyId) {
    query.companyId = req.query.companyId;
  }

  const departments = await Department.find(query)
    .populate("companyId", "name")
    .populate("branchId", "name")
    .populate("headEmployeeId", "name email");
  res.json(departments);
};

/* GET BY ID */
export const getDepartmentById = async (req: AuthRequest, res: Response) => {
  const department = await Department.findById(req.params.id)
    .populate("companyId", "name")
    .populate("branchId", "name")
    .populate("headEmployeeId", "name email");

  if (!department) {
    return res.status(404).json({ message: "Department not found" });
  }

  if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && department.companyId?.toString() !== req.user.companyId?.toString()) {
    return res.status(403).json({ message: "Access denied." });
  }

  res.json(department);
};

/* UPDATE */
export const updateDepartment = async (req: AuthRequest, res: Response) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return res.status(404).json({ message: "Department not found" });
  }

  if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && department.companyId?.toString() !== req.user.companyId?.toString()) {
    return res.status(403).json({ message: "Access denied." });
  }

  const updated = await Department.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.json(updated);
};

/* DELETE */
export const deleteDepartment = async (req: AuthRequest, res: Response) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return res.status(404).json({ message: "Department not found" });
  }

  if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && department.companyId?.toString() !== req.user.companyId?.toString()) {
    return res.status(403).json({ message: "Access denied." });
  }

  await Department.findByIdAndDelete(req.params.id);
  res.json({ message: "Department deleted" });
};
