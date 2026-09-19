import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveBalanceAdjustment extends Document {
    employee: mongoose.Types.ObjectId;
    leaveType: string;
    oldBalance: number;
    newBalance: number;
    adjustment: number;
    reason: string;
    addedBy: mongoose.Types.ObjectId;
    effectiveDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const LeaveBalanceAdjustmentSchema: Schema = new Schema(
    {
        employee: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        leaveType: {
            type: String,
            required: true,
            index: true,
        },
        oldBalance: {
            type: Number,
            required: true,
        },
        newBalance: {
            type: Number,
            required: true,
        },
        adjustment: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        effectiveDate: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

export default mongoose.model<ILeaveBalanceAdjustment>(
    "LeaveBalanceAdjustment",
    LeaveBalanceAdjustmentSchema
);
