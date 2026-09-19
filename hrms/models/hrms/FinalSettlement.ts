/** @format */

import mongoose from "mongoose";

const finalSettlementSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        status: {
            type: String,
            enum: ["NOT_STARTED", "STARTED", "FINAL"],
            default: "NOT_STARTED",
        },
        earnings: {
            type: Number,
            default: 0,
        },
        deductions: {
            type: Number,
            default: 0,
        },
        lastMonthSalary: {
            type: Number,
            default: 0,
        },
        unpaidSalary: {
            type: Number,
            default: 0,
        },
        leaveEncashment: {
            type: Number,
            default: 0,
        },
        bonus: {
            type: Number,
            default: 0,
        },
        lastWorkingDay: {
            type: Date,
            default: null,
        },
        netPayable: {
            type: Number,
            default: 0,
        },
        settlementDate: {
            type: Date,
            default: null,
        },
        notes: {
            type: String,
            default: "",
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("FinalSettlement", finalSettlementSchema);
