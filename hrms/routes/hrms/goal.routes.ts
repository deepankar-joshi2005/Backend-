/** @format */

import express from "express";
import { createGoal, getMyGoals,getMyAssignedGoals, updateGoal, deleteGoal } from "../../controllers/hrms/goalController";
import { authMiddleware } from "../../middleware/auth";
import Goal from "../../models/hrms/Goal";

const GoalRouter = express.Router();

/* ================= MANAGER GOALS ================= */
GoalRouter.post("/", authMiddleware, createGoal); // Add goal
GoalRouter.get("/my", authMiddleware, getMyGoals); // Manager goals
GoalRouter.get("/my-assigned", authMiddleware, getMyAssignedGoals);
GoalRouter.put("/:id",authMiddleware,updateGoal);
GoalRouter.delete("/:id",authMiddleware,deleteGoal);
export default GoalRouter;
