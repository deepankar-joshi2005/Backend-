"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @format */
const mongoose_1 = require("mongoose");
const ExpenseSchema = new mongoose_1.Schema({
    employee: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    expenseType: {
        type: String,
        required: true,
    },
    subCategory: {
        type: String,
    },
    billingType: {
        type: String,
        enum: ["Chargeable", "Non-Chargeable"],
        default: "Non-Chargeable",
        required: true,
    },
    travelRequestId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "TravelRequest",
    },
    amount: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    remarks: {
        type: String,
    },
    receipt: {
        type: String, // file URL
    },
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED", "PAID"],
        default: "PENDING",
    },
    paymentStatus: {
        type: String,
        enum: ["UNPAID", "PAID"],
        default: "UNPAID",
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Expense", ExpenseSchema);
