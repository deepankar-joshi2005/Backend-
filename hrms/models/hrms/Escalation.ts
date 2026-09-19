import mongoose, { Schema, Document } from "mongoose";

export interface IEscalation extends Document {
    raisedBy: mongoose.Types.ObjectId;
    module: "PAYROLL" | "ATTENDANCE" | "LEAVE" | "LOGIN" | "OTHER";
    employeeName?: string;
    description: string;
    screenshot?: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
    comments?: string;
    resolvedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const EscalationSchema: Schema = new Schema(
    {
        raisedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        module: {
            type: String,
            enum: ["PAYROLL", "ATTENDANCE", "LEAVE", "LOGIN", "OTHER"],
            required: true,
        },
        employeeName: {
            type: String,
        },
        description: {
            type: String,
            required: true,
        },
        screenshot: {
            type: String,
        },
        priority: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH"],
            default: "MEDIUM",
        },
        status: {
            type: String,
            enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"],
            default: "PENDING",
        },
        comments: {
            type: String,
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

export default mongoose.model<IEscalation>("Escalation", EscalationSchema);
