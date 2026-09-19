"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaskStatus = exports.getMyAssignedTasks = exports.getAllOnboardingTasks = exports.createOnboardingTask = void 0;
const OnboardingTask_1 = __importDefault(require("../../models/hrms/OnboardingTask"));
const Department_1 = __importDefault(require("../../models/hrms/Department"));
const constants_1 = require("../../constants");
/* ================= CREATE TASK (HR / ADMIN) ================= */
const createOnboardingTask = async (req, res) => {
    try {
        const { employeeId, departmentId, task } = req.body;
        if (!employeeId || !departmentId || !task) {
            return res.status(400).json({ message: "All fields required" });
        }
        // 🔹 department se head nikalo - Tenant Isolated
        const department = await Department_1.default.findOne({
            _id: departmentId,
            ...(req.user.role !== constants_1.ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
        });
        if (!department || !department.headEmployeeId) {
            return res.status(400).json({
                message: "Department head not assigned",
            });
        }
        const onboardingTask = await OnboardingTask_1.default.create({
            employee: employeeId,
            department: departmentId,
            assignedTo: department.headEmployeeId,
            task,
            status: "PENDING",
            companyId: req.user.companyId,
        });
        res.status(201).json(onboardingTask);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to create onboarding task",
        });
    }
};
exports.createOnboardingTask = createOnboardingTask;
/* ================= GET ALL TASKS (HR / ADMIN) ================= */
const getAllOnboardingTasks = async (req, res) => {
    try {
        const filter = {};
        if (req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        const tasks = await OnboardingTask_1.default.find(filter)
            .populate("employee", "name email")
            .populate("department", "name")
            .populate("assignedTo", "name email")
            .sort({ createdAt: -1 });
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch onboarding tasks",
        });
    }
};
exports.getAllOnboardingTasks = getAllOnboardingTasks;
/* ================= GET TASKS FOR DEPARTMENT HEAD ================= */
const getMyAssignedTasks = async (req, res) => {
    try {
        const tasks = await OnboardingTask_1.default.find({
            assignedTo: req.user.id,
            ...(req.user.role !== constants_1.ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
        })
            .populate("employee", "name email")
            .populate("department", "name")
            .sort({ createdAt: -1 });
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch tasks",
        });
    }
};
exports.getMyAssignedTasks = getMyAssignedTasks;
/* ================= UPDATE STATUS (DEPARTMENT HEAD) ================= */
const updateTaskStatus = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!["PENDING", "COMPLETED"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status value",
            });
        }
        const task = await OnboardingTask_1.default.findById(id);
        if (!task) {
            return res.status(404).json({
                message: "Onboarding task not found",
            });
        }
        // Access check
        if (req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = task.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        task.status = status;
        await task.save();
        res.json({
            message: "Task status updated successfully",
            task,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update task status",
        });
    }
};
exports.updateTaskStatus = updateTaskStatus;
