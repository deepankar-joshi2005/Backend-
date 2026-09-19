/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ICostCenter extends Document {
    companyId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    departmentId?: mongoose.Types.ObjectId;
    name: string;
    code: string;
    description?: string;
    status: "Active" | "Inactive";
    createdAt: Date;
    updatedAt: Date;
}

const costCenterSchema = new Schema<ICostCenter>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        branchId: {
            type: Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            required: false,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        description: {
            type: String,
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

export default mongoose.model<ICostCenter>("CostCenter", costCenterSchema);
