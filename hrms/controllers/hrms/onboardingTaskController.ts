import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import OnboardingTask from "../../models/hrms/OnboardingTask";
import Department from "../../models/hrms/Department";
import { ROLES } from "../../constants";

/* ================= CREATE TASK (HR / ADMIN) ================= */
export const createOnboardingTask = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, departmentId, task } = req.body;

    if (!employeeId || !departmentId || !task) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 🔹 department se head nikalo - Tenant Isolated
    const department = await Department.findOne({
      _id: departmentId,
      ...(req.user.role !== ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
    });

    if (!department || !department.headEmployeeId) {
      return res.status(400).json({
        message: "Department head not assigned",
      });
    }

    const onboardingTask = await OnboardingTask.create({
      employee: employeeId,
      department: departmentId,
      assignedTo: department.headEmployeeId,
      task,
      status: "PENDING",
      companyId: req.user.companyId,
    });

    res.status(201).json(onboardingTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create onboarding task",
    });
  }
};

/* ================= GET ALL TASKS (HR / ADMIN) ================= */
export const getAllOnboardingTasks = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const filter: any = {};
    if (req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    }

    const tasks = await OnboardingTask.find(filter)
      .populate("employee", "name email")
      .populate("department", "name")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch onboarding tasks",
    });
  }
};

/* ================= GET TASKS FOR DEPARTMENT HEAD ================= */
export const getMyAssignedTasks = async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await OnboardingTask.find({
      assignedTo: req.user!.id,
      ...(req.user.role !== ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
    })
      .populate("employee", "name email")
      .populate("department", "name")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tasks",
    });
  }
};

/* ================= UPDATE STATUS (DEPARTMENT HEAD) ================= */
export const updateTaskStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["PENDING", "COMPLETED"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const task = await OnboardingTask.findById(id);

    if (!task) {
      return res.status(404).json({
        message: "Onboarding task not found",
      });
    }

    // Access check
    if (req.user.role !== ROLES.HRMSAdmin && task.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    task.status = status;
    await task.save();

    res.json({
      message: "Task status updated successfully",
      task,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update task status",
    });
  }
};