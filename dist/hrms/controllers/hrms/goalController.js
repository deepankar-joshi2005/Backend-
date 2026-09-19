"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGoal = exports.updateGoal = exports.getMyAssignedGoals = exports.getMyGoals = exports.createGoal = void 0;
const Goal_1 = __importDefault(require("../../models/hrms/Goal"));
/* ======================================================
   ✅ CREATE GOAL (Manager)
   ====================================================== */
const createGoal = async (req, res) => {
    var _a;
    try {
        const managerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { title, description, assignedTo, progress, deadline } = req.body;
        if (!title || !assignedTo) {
            return res.status(400).json({
                message: "Title and Assigned user are required",
            });
        }
        const goal = await Goal_1.default.create({
            title,
            description,
            assignedTo,
            managerId,
            progress: progress !== null && progress !== void 0 ? progress : 0, // default 0
            deadline,
        });
        res.status(201).json({
            message: "Goal created successfully",
            goal,
        });
    }
    catch (error) {
        console.error("Create goal error:", error);
        res.status(500).json({
            message: "Failed to create goal",
            error: error.message,
        });
    }
};
exports.createGoal = createGoal;
/* ======================================================
   ✅ GET LOGGED-IN MANAGER GOALS
   ====================================================== */
const getMyGoals = async (req, res) => {
    var _a;
    try {
        const managerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const goals = await Goal_1.default.find({ managerId })
            .populate("assignedTo", "name employeeId")
            .sort({ createdAt: -1 });
        res.json(goals);
    }
    catch (error) {
        console.error("Fetch goals error:", error);
        res.status(500).json({
            message: "Failed to fetch goals",
        });
    }
};
exports.getMyGoals = getMyGoals;
/* ======================================================
   ✅ GET EMPLOYEE ASSIGNED GOALS
   ====================================================== */
const getMyAssignedGoals = async (req, res) => {
    var _a;
    try {
        const employeeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const goals = await Goal_1.default.find({ assignedTo: employeeId })
            .populate("managerId", "name employeeId")
            .sort({ createdAt: -1 });
        res.json(goals);
    }
    catch (error) {
        console.error("Fetch assigned goals error:", error);
        res.status(500).json({
            message: "Failed to fetch assigned goals",
        });
    }
};
exports.getMyAssignedGoals = getMyAssignedGoals;
/* ======================================================
   ✅ UPDATE GOAL (Manager Only)
   ====================================================== */
const updateGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, assignedTo, progress, deadline, status } = req.body;
        // 🔍 check goal exists & belongs to manager
        const goal = await Goal_1.default.findOne({ _id: id });
        if (!goal) {
            return res.status(404).json({
                message: "Goal not found or unauthorized",
            });
        }
        // ✅ update fields
        goal.title = title !== null && title !== void 0 ? title : goal.title;
        goal.description = description !== null && description !== void 0 ? description : goal.description;
        goal.assignedTo = assignedTo !== null && assignedTo !== void 0 ? assignedTo : goal.assignedTo;
        goal.progress = progress !== null && progress !== void 0 ? progress : goal.progress;
        goal.deadline = deadline !== null && deadline !== void 0 ? deadline : goal.deadline;
        goal.status = status !== null && status !== void 0 ? status : goal.status;
        await goal.save();
        res.json({
            message: "Goal updated successfully",
            goal,
        });
    }
    catch (error) {
        console.error("Update goal error:", error);
        res.status(500).json({
            message: "Failed to update goal",
            error: error.message,
        });
    }
};
exports.updateGoal = updateGoal;
/* ======================================================
   ✅ DELETE GOAL (Manager Only)
   ====================================================== */
const deleteGoal = async (req, res) => {
    var _a;
    try {
        const managerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { id } = req.params;
        const goal = await Goal_1.default.findOneAndDelete({
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
    }
    catch (error) {
        console.error("Delete goal error:", error);
        res.status(500).json({
            message: "Failed to delete goal",
            error: error.message,
        });
    }
};
exports.deleteGoal = deleteGoal;
