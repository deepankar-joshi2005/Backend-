/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IStatutoryReport extends Document {
    employee: mongoose.Types.ObjectId;
    month: string; // YYYY-MM
    pf: number;
    esi: number;
    pt: number;
    tds: number;
    grossSalary: number;
    netSalary: number;
    totalDeduction: number;
    companyId: mongoose.Types.ObjectId;
}

const StatutoryReportSchema = new Schema<IStatutoryReport>(
    {
        employee: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        month: {
            type: String,
            required: true,
        },
        pf: {
            type: Number,
            required: true,
        },
        esi: {
            type: Number,
            required: true,
        },
        pt: {
            type: Number,
            required: true,
        },
        tds: {
            type: Number,
            required: true,
        },
        grossSalary: {
            type: Number,
            required: true,
        },
        netSalary: {
            type: Number,
            required: true,
        },
        totalDeduction: {
            type: Number,
            required: true,
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

StatutoryReportSchema.index({ employee: 1, month: 1 }, { unique: true });

export default mongoose.model<IStatutoryReport>(
    "StatutoryReport",
    StatutoryReportSchema
);
