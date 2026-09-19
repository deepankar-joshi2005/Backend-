"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const workstationSchema = new mongoose_1.Schema({
    employee: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    building: {
        type: String,
        required: true,
    },
    floor: {
        type: String,
        required: true,
    },
    deskCode: {
        type: String,
        required: true,
        unique: true,
    },
    seatType: {
        type: String,
        enum: ["OPEN_DESK", "CABIN"],
        required: true,
    },
    status: {
        type: String,
        enum: ["ALLOCATED", "RELEASED"],
        default: "ALLOCATED",
    },
    allocatedAt: {
        type: Date,
        default: Date.now,
    },
    releasedAt: {
        type: Date,
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Workstation", workstationSchema);
