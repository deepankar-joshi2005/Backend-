"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const attendanceRequestSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    type: { type: String, required: true },
    punchIn: String,
    punchOut: String,
    reason: { type: String, required: true },
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING",
    },
    adminRemark: String,
    companyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("AttendanceRequest", attendanceRequestSchema);
