import { Response } from "express";
import SalaryStructure, { EARNING_FIELDS, DEDUCTION_FIELDS } from "../../models/hrms/SalaryStructure";
import User from "../../models/User";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

const COMPONENT_FIELDS = [...EARNING_FIELDS, ...DEDUCTION_FIELDS];

/**
 * ➕ Add Salary Structure
 */
export const addSalaryStructure = async (req: AuthRequest, res: Response) => {
  try {
    const { employee } = req.body;

    if (!employee) {
      return res.status(400).json({ message: "Employee is required" });
    }

    const components: Record<string, number> = {};
    for (const field of COMPONENT_FIELDS) {
      if (req.body[field] != null) components[field] = req.body[field];
    }

    const { companyId, role } = req.user;

    // Verify target employee belongs to same company
    const targetUser = await User.findById(employee);
    if (!targetUser) return res.status(404).json({ message: "Employee not found" });

    if (role !== ROLES.HRMSAdmin && targetUser.companyId?.toString() !== companyId?.toString()) {
        return res.status(403).json({ message: "Access denied. Employee belongs to another company." });
    }

    // check duplicate
    const exists = await SalaryStructure.findOne({ 
        employee,
        ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
    });
    if (exists) {
      return res.status(400).json({
        message: "Salary structure already exists for this employee",
      });
    }

    const salary = await SalaryStructure.create({
      employee,
      ...components,
      companyId: companyId, // Set companyId
    });

    res.status(201).json({
      message: "Salary structure added successfully",
      salary,
    });
  } catch (error: any) {
    console.error("Add salary error:", error);
    res.status(500).json({
      message: "Failed to add salary structure",
      error: error.message,
    });
  }
};

/**
 * 📋 Get All Salary Structures
 */
export const getAllSalaryStructures = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId: qCompanyId } = req.query;
    const { companyId: uCompanyId, role } = req.user;

    let filter: any = {};
    if (role !== ROLES.HRMSAdmin) {
        filter.companyId = uCompanyId;
    } else if (qCompanyId) {
        filter.companyId = qCompanyId;
    }

    const salaryList = await SalaryStructure.find(filter)
      .populate({
        path: "employee",
        populate: [
          { path: "designationId" },
          { path: "departmentId" },
          { path: "branchId" }
        ]
      })
      .sort({ createdAt: -1 });

    res.json(salaryList);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch salary structures",
      error: error.message,
    });
  }
};

/**
 * 🔍 Get Salary Structure By ID (Employee ID)
 */
export const getSalaryStructureById = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, role } = req.user;
    
    const salary = await SalaryStructure.findOne({ 
        employee: req.params.id,
        ...(role !== ROLES.HRMSAdmin ? { companyId } : {})
    }).populate({
      path: "employee",
      populate: [
        { path: "designationId" },
        { path: "departmentId" },
        { path: "branchId" }
      ]
    });

    if (!salary) {
      return res.status(404).json({ message: "Salary structure not found" });
    }

    res.json(salary);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch salary structure",
      error: error.message,
    });
  }
};

/**
 * ✏️ Update Salary Structure
 */
export const updateSalaryStructure = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, role } = req.user;

    const existingSalary = await SalaryStructure.findById(req.params.id);
    if (!existingSalary) return res.status(404).json({ message: "Salary structure not found" });

    // Access check
    if (role !== ROLES.HRMSAdmin && existingSalary.companyId?.toString() !== companyId?.toString()) {
        return res.status(403).json({ message: "Access denied." });
    }

    const updateData: any = {};
    for (const field of COMPONENT_FIELDS) {
      if (req.body[field] != null) updateData[field] = req.body[field];
    }

    const salary = await SalaryStructure.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate({
      path: "employee",
      select: "name employeeId joiningDate designationId departmentId branchId",
      populate: [
        { path: "designationId", select: "name" },
        { path: "departmentId", select: "name" },
        { path: "branchId", select: "name" }
      ]
    });

    res.json({
      message: "Salary structure updated successfully",
      salary,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update salary structure",
      error: error.message,
    });
  }
};

/**
 * 🗑️ Delete Salary Structure
 */
export const deleteSalaryStructureById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { companyId, role } = req.user;
    
    const existingSalary = await SalaryStructure.findById(req.params.id);
    if (!existingSalary) return res.status(404).json({ message: "Salary structure not found" });

    // Access check
    if (role !== ROLES.HRMSAdmin && existingSalary.companyId?.toString() !== companyId?.toString()) {
        return res.status(403).json({ message: "Access denied." });
    }

    await SalaryStructure.findByIdAndDelete(req.params.id);

    res.json({
      message: "Salary structure deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete salary structure",
      error: error.message,
    });
  }
};
