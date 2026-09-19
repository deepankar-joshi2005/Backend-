/** @format */
import { Router } from "express";
import {
  createExpense,
  getMyExpenses,
  updateExpenseStatus,
  deleteExpense,
  getTeamExpenseRequests,
  getAllExpenseRequests
} from "../../controllers/hrms/expenseController";
import { authMiddleware } from "../../middleware/auth";
import { expenseUpload } from "../../utils/uploadExpense";

const ExpenseRouter = Router();

/* EMPLOYEE */
ExpenseRouter.post(
  "/",
  authMiddleware,
  expenseUpload.single("receipt"),
  createExpense
);

ExpenseRouter.get("/me", authMiddleware, getMyExpenses);

/* HR / ADMIN */
ExpenseRouter.put("/:id/status", authMiddleware, updateExpenseStatus);

ExpenseRouter.delete("/:id", authMiddleware, deleteExpense);

ExpenseRouter.get("/manager", authMiddleware, getTeamExpenseRequests);
ExpenseRouter.get("/all", authMiddleware, getAllExpenseRequests);


export default ExpenseRouter;
