"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllExpenseRequests = exports.deleteExpense = exports.updateExpenseStatus = exports.getTeamExpenseRequests = exports.getMyExpenses = exports.createExpense = void 0;
const Expense_1 = __importDefault(require("../../models/hrms/Expense"));
const User_1 = __importDefault(require("../../models/User"));
/* ================= EMPLOYEE: CREATE EXPENSE ================= */
const createExpense = async (req, res) => {
    try {
        const { expenseType, subCategory, billingType, travelRequestId, amount, date, remarks } = req.body;
        const expense = await Expense_1.default.create({
            employee: req.user.id,
            expenseType,
            subCategory,
            billingType,
            travelRequestId: expenseType === "Travel Expense" ? travelRequestId : undefined,
            amount,
            date,
            remarks,
            receipt: req.file ? `/uploads/expenses/${req.file.filename}` : undefined,
            status: "PENDING",
        });
        res.status(201).json(expense);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to submit expense" });
    }
};
exports.createExpense = createExpense;
/* ================= EMPLOYEE: MY EXPENSES ================= */
const getMyExpenses = async (req, res) => {
    try {
        const expenses = await Expense_1.default.find({
            employee: req.user.id,
        }).sort({ createdAt: -1 });
        res.json(expenses);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch expenses" });
    }
};
exports.getMyExpenses = getMyExpenses;
/* ================= MANAGER: TEAM EXPENSE REQUESTS ================= */
const getTeamExpenseRequests = async (req, res) => {
    try {
        const managerId = req.user.id;
        // 🔹 manager ke under employees
        const teamEmployees = await User_1.default.find({ managerId }, "_id name email");
        const employeeIds = teamEmployees.map((e) => e._id);
        // 🔹 unhi employees ke expenses
        const expenses = await Expense_1.default.find({
            employee: { $in: employeeIds },
        })
            .populate("employee", "name email")
            .sort({ createdAt: -1 });
        res.status(200).json(expenses);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch expense requests",
        });
    }
};
exports.getTeamExpenseRequests = getTeamExpenseRequests;
/* ================= MANAGER: UPDATE STATUS ================= */
const updateExpenseStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!["APPROVED", "REJECTED", "PAID"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const expense = await Expense_1.default.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }
        expense.status = status;
        await expense.save();
        res.json(expense);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update expense status" });
    }
};
exports.updateExpenseStatus = updateExpenseStatus;
/* ================= EMPLOYEE: DELETE (ONLY PENDING) ================= */
const deleteExpense = async (req, res) => {
    const expense = await Expense_1.default.findOneAndDelete({
        _id: req.params.id,
        employee: req.user.id,
        status: "PENDING",
    });
    if (!expense) {
        return res.status(404).json({
            message: "Expense not found or can't be deleted",
        });
    }
    res.json({ message: "Expense deleted successfully" });
};
exports.deleteExpense = deleteExpense;
/* ================= ADMIN / FINANCE: ALL EXPENSE REQUESTS ================= */
const getAllExpenseRequests = async (req, res) => {
    try {
        const expenses = await Expense_1.default.find()
            .populate("employee", "name email employeeId")
            .sort({ createdAt: -1 });
        res.status(200).json(expenses);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch all expense requests",
        });
    }
};
exports.getAllExpenseRequests = getAllExpenseRequests;
