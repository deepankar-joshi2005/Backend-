"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @format */
const mongoose_1 = require("mongoose");
const TravelRequestSchema = new mongoose_1.Schema({
    employee: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    purpose: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    fromDate: {
        type: Date,
        required: true,
    },
    toDate: {
        type: Date,
        required: true,
    },
    budget: {
        type: Number,
        required: true,
    },
    payable: {
        type: Number,
    },
    paymentStatus: {
        type: String,
        enum: ["UNPAID", "PAID"],
        default: "UNPAID",
    },
    receiptUrl: {
        type: String,
    },
    remarks: String,
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED", "PAID"],
        default: "PENDING",
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("TravelRequest", TravelRequestSchema);
