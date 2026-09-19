"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @format */
const express_1 = require("express");
const expenseController_1 = require("../../controllers/hrms/expenseController");
const auth_1 = require("../../middleware/auth");
const uploadExpense_1 = require("../../utils/uploadExpense");
const ExpenseRouter = (0, express_1.Router)();
/* EMPLOYEE */
ExpenseRouter.post("/", auth_1.authMiddleware, uploadExpense_1.expenseUpload.single("receipt"), expenseController_1.createExpense);
ExpenseRouter.get("/me", auth_1.authMiddleware, expenseController_1.getMyExpenses);
/* HR / ADMIN */
ExpenseRouter.put("/:id/status", auth_1.authMiddleware, expenseController_1.updateExpenseStatus);
ExpenseRouter.delete("/:id", auth_1.authMiddleware, expenseController_1.deleteExpense);
ExpenseRouter.get("/manager", auth_1.authMiddleware, expenseController_1.getTeamExpenseRequests);
ExpenseRouter.get("/all", auth_1.authMiddleware, expenseController_1.getAllExpenseRequests);
exports.default = ExpenseRouter;
