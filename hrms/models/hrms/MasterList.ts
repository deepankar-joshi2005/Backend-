/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IMasterList extends Document {
    type: "EMPLOYEE_CATEGORY" | "EXPENSE_CATEGORY" | "REIMBURSEMENT_CATEGORY";
    name: string;
    status: "Active" | "Inactive";
    createdAt: Date;
    updatedAt: Date;
}

const masterListSchema = new Schema<IMasterList>(
    {
        type: {
            type: String,
            enum: ["EMPLOYEE_CATEGORY", "EXPENSE_CATEGORY", "REIMBURSEMENT_CATEGORY"],
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
        },
    },
    { timestamps: true }
);

export default mongoose.model<IMasterList>("MasterList", masterListSchema);
