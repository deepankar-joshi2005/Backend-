/** @format */
import { Response } from "express";
import Expense from "../../models/hrms/Expense";
import User from "../../models/User";
import { AuthRequest } from "../../middleware/auth";

/* ================= EMPLOYEE: CREATE EXPENSE ================= */
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      expenseType, 
      subCategory, 
      billingType, 
      travelRequestId, 
      amount, 
      date, 
      remarks 
    } = req.body;

    const expense = await Expense.create({
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
  } catch (error) {
    res.status(500).json({ message: "Failed to submit expense" });
  }
};

/* ================= EMPLOYEE: MY EXPENSES ================= */
export const getMyExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const expenses = await Expense.find({
      employee: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

/* ================= MANAGER: TEAM EXPENSE REQUESTS ================= */
export const getTeamExpenseRequests = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const managerId = req.user.id;

    // 🔹 manager ke under employees
    const teamEmployees = await User.find({ managerId }, "_id name email");

    const employeeIds = teamEmployees.map((e) => e._id);

    // 🔹 unhi employees ke expenses
    const expenses = await Expense.find({
      employee: { $in: employeeIds },
    })
      .populate("employee", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch expense requests",
    });
  }
};

/* ================= MANAGER: UPDATE STATUS ================= */
export const updateExpenseStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    if (!["APPROVED", "REJECTED","PAID"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    expense.status = status;
    await expense.save();

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: "Failed to update expense status" });
  }
};

/* ================= EMPLOYEE: DELETE (ONLY PENDING) ================= */
export const deleteExpense = async (req: AuthRequest, res: Response) => {
  const expense = await Expense.findOneAndDelete({
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
/* ================= ADMIN / FINANCE: ALL EXPENSE REQUESTS ================= */
export const getAllExpenseRequests = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const expenses = await Expense.find()
      .populate("employee", "name email employeeId")
      .sort({ createdAt: -1 });

    res.status(200).json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch all expense requests",
    });
  }
};
