"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const finalSettlementSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    status: {
        type: String,
        enum: ["NOT_STARTED", "STARTED", "FINAL"],
        default: "NOT_STARTED",
    },
    earnings: {
        type: Number,
        default: 0,
    },
    deductions: {
        type: Number,
        default: 0,
    },
    lastMonthSalary: {
        type: Number,
        default: 0,
    },
    unpaidSalary: {
        type: Number,
        default: 0,
    },
    leaveEncashment: {
        type: Number,
        default: 0,
    },
    bonus: {
        type: Number,
        default: 0,
    },
    lastWorkingDay: {
        type: Date,
        default: null,
    },
    netPayable: {
        type: Number,
        default: 0,
    },
    settlementDate: {
        type: Date,
        default: null,
    },
    notes: {
        type: String,
        default: "",
    },
    companyId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model("FinalSettlement", finalSettlementSchema);
