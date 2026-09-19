"use strict";
/** @format */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const PayrollSchema = new mongoose_1.Schema({
    employee: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    month: {
        type: String,
        required: true,
    },
    gross: {
        type: Number,
        required: true,
    },
    deduction: {
        type: Number,
        required: true,
    },
    net: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["Draft", "Processed", "Paid", "Rejected"],
        default: "Draft",
    },
    payDays: {
        type: Number,
        default: 0,
    },
    lopDays: {
        type: Number,
        default: 0,
    },
    rejectReason: {
        type: String,
    },
    rejectedAt: {
        type: Date,
    },
    companyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
    },
    fullDays: { type: Number, default: 0 },
    lateFullDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    lateHalfDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    holidayDays: { type: Number, default: 0 },
    weeklyOffDays: { type: Number, default: 0 },
    lateOccurrences: { type: Number, default: 0 },
    lateAggregateHalfDayDeductions: { type: Number, default: 0 },
    perDayRate: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },
    encashmentBonus: { type: Number, default: 0 },
    fixedDeductionAmount: { type: Number, default: 0 },
    lopDeductionAmount: { type: Number, default: 0 },
    dailyBreakdown: {
        type: [
            {
                date: String,
                status: String,
                lateByMinutes: Number,
                workedHours: Number,
                reason: String,
                _id: false,
            },
        ],
        default: [],
    },
}, { timestamps: true });
/* 🔒 One payroll per employee per month */
PayrollSchema.index({ employee: 1, month: 1 }, { unique: true });
exports.default = mongoose_1.default.model("Payroll", PayrollSchema);
