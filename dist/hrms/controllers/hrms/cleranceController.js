"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDepartmentClearance = exports.getAllClearances = exports.createClearanceFromResignation = void 0;
const Clearance_1 = __importDefault(require("../../models/hrms/Clearance"));
const User_1 = __importDefault(require("../../models/User"));
const constants_1 = require("../../constants");
/* 🔹 Create Clearance when Resignation Approved */
const createClearanceFromResignation = async (resignation) => {
    await Clearance_1.default.create({
        resignation: resignation._id,
        employee: resignation.employee,
        lastWorkingDay: resignation.expectedLastWorkingDay,
        companyId: resignation.companyId, // Inherit companyId from resignation
        clearances: [
            { department: "IT", status: "PENDING", tasks: [] },
            { department: "Finance", status: "PENDING", tasks: [] },
            { department: "HR", status: "PENDING", tasks: [] },
            { department: "Admin", status: "PENDING", tasks: [] },
        ],
    });
};
exports.createClearanceFromResignation = createClearanceFromResignation;
/* 🔹 Get All Clearance */
const getAllClearances = async (req, res) => {
    try {
        const { page = "1", limit = "15", search = "" } = req.query;
        const pageNum = Math.max(Number(page), 1);
        const limitNum = Math.max(Number(limit), 1);
        const skip = (pageNum - 1) * limitNum;
        let filter = {};
        if (req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        if (search) {
            const users = await User_1.default.find({
                name: { $regex: search, $options: "i" },
                ...(req.user.role !== constants_1.ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
            }).select("_id");
            const userIds = users.map((u) => u._id);
            filter.employee = { $in: userIds };
        }
        const [data, totalRecords] = await Promise.all([
            Clearance_1.default.find(filter)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate({
                path: "employee",
                select: "name role departmentId",
                populate: {
                    path: "departmentId",
                    select: "name",
                },
            }),
            Clearance_1.default.countDocuments(filter),
        ]);
        res.json({
            success: true,
            data,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limitNum),
            currentPage: pageNum,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.getAllClearances = getAllClearances;
/* 🔹 Update Department Clearance Status */
const updateDepartmentClearance = async (req, res) => {
    var _a, _b;
    try {
        const { clearanceId } = req.params;
        const { departmentName, status, remarks, tasks } = req.body;
        const clearance = await Clearance_1.default.findById(clearanceId);
        if (!clearance) {
            return res.status(404).json({ message: "Clearance not found" });
        }
        // Access check
        if (req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = clearance.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        const dept = clearance.clearances.find((c) => c.department === departmentName);
        if (!dept) {
            return res.status(404).json({ message: "Department not found" });
        }
        dept.status = status;
        if (remarks)
            dept.remarks = remarks;
        if (tasks)
            dept.tasks = tasks;
        clearance.overallStatus = clearance.clearances.every((c) => c.status === "CLEARED")
            ? "COMPLETED"
            : "IN_PROGRESS";
        await clearance.save();
        res.json({ message: "Updated", data: clearance });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.updateDepartmentClearance = updateDepartmentClearance;
