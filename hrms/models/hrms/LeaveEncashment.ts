/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveEncashment extends Document {
    employee: mongoose.Types.ObjectId;
    leaveType: string;
    requestedDays: number;
    perDayRate: number;
    totalAmount: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    paymentStatus: "UNPAID" | "PAID";
    requestDate: Date;
    payrollMonth?: string; // YYYY-MM
    approvedAt?: Date;
    approvedBy?: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
}

const LeaveEncashmentSchema = new Schema<ILeaveEncashment>(
    {
        employee: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        leaveType: {
            type: String,
            required: true,
        },
        requestedDays: {
            type: Number,
            required: true,
        },
        perDayRate: {
            type: Number,
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
        },
        paymentStatus: {
            type: String,
            enum: ["UNPAID", "PAID"],
            default: "UNPAID",
        },
        requestDate: {
            type: Date,
            default: Date.now,
        },
        payrollMonth: {
            type: String,
        },
        approvedAt: {
            type: Date,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model<ILeaveEncashment>(
    "LeaveEncashment",
    LeaveEncashmentSchema
);
