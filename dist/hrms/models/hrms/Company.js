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
const companySchema = new mongoose_1.Schema({
    companyId: {
        type: String,
        unique: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    phone: {
        type: String,
        default: "",
    },
    website: {
        type: String,
        default: "",
    },
    industry: {
        type: String,
        default: "",
    },
    city: {
        type: String,
        default: "",
        trim: true,
    },
    state: {
        type: String,
        default: "",
        trim: true,
    },
    address: {
        type: String,
        default: "",
    },
    caFirmId: {
        type: String,
        default: null,
        index: true,
    },
    caFirmName: {
        type: String,
        default: null,
    },
    logo: {
        type: String,
        default: "",
    },
    stamp: {
        type: String,
        default: "",
    },
    gstNo: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active",
    },
    subscriptionPlan: {
        type: String,
        enum: ["TRIAL", "ACTIVE", "EXPIRED"],
        default: "TRIAL",
    },
    subscriptionStatus: {
        type: String,
        enum: ["PENDING", "PAID", "OVERDUE"],
        default: "PENDING",
    },
    trialStartDate: {
        type: Date,
        default: Date.now,
    },
    trialEndDate: {
        type: Date,
        default: () => new Date(+new Date() + 15 * 24 * 60 * 60 * 1000), // 15 days trial
    },
    subscriptionEndDate: {
        type: Date,
        default: null,
    },
    employeeLimit: {
        type: Number,
        default: 0,
    },
    subscriptionAmount: {
        type: Number,
        default: 0,
    },
    unbilledUsageDays: {
        type: Number,
        default: 0,
    },
    lastBillingDate: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: false, // Optional for public registration
    },
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model("Company", companySchema);
// only check
