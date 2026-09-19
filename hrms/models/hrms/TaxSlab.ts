/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ITaxSlab extends Document {
    minIncome: number;
    maxIncome: number;
    percentage: number;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const taxSlabSchema = new Schema<ITaxSlab>(
    {
        minIncome: {
            type: Number,
            required: true,
        },
        maxIncome: {
            type: Number,
            required: true,
        },
        percentage: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model<ITaxSlab>("TaxSlab", taxSlabSchema);
