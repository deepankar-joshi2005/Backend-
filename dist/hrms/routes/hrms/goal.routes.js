"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const goalController_1 = require("../../controllers/hrms/goalController");
const auth_1 = require("../../middleware/auth");
const GoalRouter = express_1.default.Router();
/* ================= MANAGER GOALS ================= */
GoalRouter.post("/", auth_1.authMiddleware, goalController_1.createGoal); // Add goal
GoalRouter.get("/my", auth_1.authMiddleware, goalController_1.getMyGoals); // Manager goals
GoalRouter.get("/my-assigned", auth_1.authMiddleware, goalController_1.getMyAssignedGoals);
GoalRouter.put("/:id", auth_1.authMiddleware, goalController_1.updateGoal);
GoalRouter.delete("/:id", auth_1.authMiddleware, goalController_1.deleteGoal);
exports.default = GoalRouter;
