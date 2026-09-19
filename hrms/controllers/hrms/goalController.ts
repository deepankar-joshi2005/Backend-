/** @format */

import { Response } from "express";
import Goal from "../../models/hrms/Goal";
import { AuthRequest } from "../../middleware/auth";

/* ======================================================
   ✅ CREATE GOAL (Manager)
   ====================================================== */
export const createGoal = async (req: AuthRequest, res: Response) => {
  try {
    const managerId = req.user?.id;

    const { title, description, assignedTo, progress,deadline } = req.body;

    if (!title || !assignedTo) {
      return res.status(400).json({
        message: "Title and Assigned user are required",
      });
    }

    const goal = await Goal.create({
      title,
      description,
      assignedTo,
      managerId,
      progress: progress ?? 0, // default 0
      deadline,
    });

    res.status(201).json({
      message: "Goal created successfully",
      goal,
    });
  } catch (error: any) {
    console.error("Create goal error:", error);
    res.status(500).json({
      message: "Failed to create goal",
      error: error.message,
    });
  }
};

/* ======================================================
   ✅ GET LOGGED-IN MANAGER GOALS
   ====================================================== */
export const getMyGoals = async (req: AuthRequest, res: Response) => {
  try {
    const managerId = req.user?.id;

    const goals = await Goal.find({ managerId })
      .populate("assignedTo", "name employeeId")
      .sort({ createdAt: -1 });

    res.json(goals);
  } catch (error: any) {
    console.error("Fetch goals error:", error);
    res.status(500).json({
      message: "Failed to fetch goals",
    });
  }
};

/* ======================================================
   ✅ GET EMPLOYEE ASSIGNED GOALS
   ====================================================== */
export const getMyAssignedGoals = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.id;

    const goals = await Goal.find({ assignedTo: employeeId })
      .populate("managerId", "name employeeId")
      .sort({ createdAt: -1 });

    res.json(goals);
  } catch (error) {
    console.error("Fetch assigned goals error:", error);
    res.status(500).json({
      message: "Failed to fetch assigned goals",
    });
  }
};

/* ======================================================
   ✅ UPDATE GOAL (Manager Only)
   ====================================================== */
export const updateGoal = async (req: AuthRequest, res: Response) => {
  try {

    const { id } = req.params;

    const { title, description, assignedTo, progress, deadline, status } =
      req.body;

    // 🔍 check goal exists & belongs to manager
    const goal = await Goal.findOne({ _id: id});

    if (!goal) {
      return res.status(404).json({
        message: "Goal not found or unauthorized",
      });
    }

    // ✅ update fields
    goal.title = title ?? goal.title;
    goal.description = description ?? goal.description;
    goal.assignedTo = assignedTo ?? goal.assignedTo;
    goal.progress = progress ?? goal.progress;
    goal.deadline = deadline ?? goal.deadline;
    goal.status = status ?? goal.status;

    await goal.save();

    res.json({
      message: "Goal updated successfully",
      goal,
    });
  } catch (error: any) {
    console.error("Update goal error:", error);
    res.status(500).json({
      message: "Failed to update goal",
      error: error.message,
    });
  }
};
/* ======================================================
   ✅ DELETE GOAL (Manager Only)
   ====================================================== */
export const deleteGoal = async (req: AuthRequest, res: Response) => {
  try {
    const managerId = req.user?.id;
    const { id } = req.params;

    const goal = await Goal.findOneAndDelete({
      _id: id,
      managerId,
    });

    if (!goal) {
      return res.status(404).json({
        message: "Goal not found or unauthorized",
      });
    }

    res.json({
      message: "Goal deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete goal error:", error);
    res.status(500).json({
      message: "Failed to delete goal",
      error: error.message,
    });
  }
};

