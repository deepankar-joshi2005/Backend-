/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IWorkingDay extends Document {
    companyId: mongoose.Types.ObjectId;
    weeklyOff: {
        monday: "Working" | "Half Day" | "OFF";
        tuesday: "Working" | "Half Day" | "OFF";
        wednesday: "Working" | "Half Day" | "OFF";
        thursday: "Working" | "Half Day" | "OFF";
        friday: "Working" | "Half Day" | "OFF";
        saturday: "Working" | "Half Day" | "OFF";
        sunday: "Working" | "Half Day" | "OFF";
    };
    officeTiming: {
        startTime: string;
        endTime: string;
        breakTime: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const workingDaySchema = new Schema<IWorkingDay>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            unique: true, // Assuming one global config per company for simplicity
        },
        weeklyOff: {
            monday: { type: String, enum: ["Working", "Half Day", "OFF"], default: "Working" },
            tuesday: { type: String, enum: ["Working", "Half Day", "OFF"], default: "Working" },
            wednesday: { type: String, enum: ["Working", "Half Day", "OFF"], default: "Working" },
            thursday: { type: String, enum: ["Working", "Half Day", "OFF"], default: "Working" },
            friday: { type: String, enum: ["Working", "Half Day", "OFF"], default: "Working" },
            saturday: { type: String, enum: ["Working", "Half Day", "OFF"], default: "Half Day" },
            sunday: { type: String, enum: ["Working", "Half Day", "OFF"], default: "OFF" },
        },
        officeTiming: {
            startTime: { type: String, default: "09:30 AM" },
            endTime: { type: String, default: "06:30 PM" },
            breakTime: { type: String, default: "01:00 PM - 02:00 PM" },
        },
    },
    { timestamps: true }
);

export default mongoose.model<IWorkingDay>("WorkingDay", workingDaySchema);
