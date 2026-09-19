"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const userSchema = new mongoose_1.default.Schema({
    /* ================= BASIC INFORMATION ================= */
    employeeId: {
        type: String,
        unique: true,
        index: true, // search fast
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
    },
    mobile: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        default: null,
        trim: true,
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true,
    },
    dob: {
        type: Date,
        required: true,
    },
    joiningDate: {
        type: Date,
        required: true,
    },
    /* ================= AUTH ================= */
    password: {
        type: String,
        default: null,
    },
    role: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    isVerified: { type: Boolean, default: false },
    isSystemAdmin: { type: Boolean, default: false },
    /* ================= COMPANY & JOB DETAILS ================= */
    companyId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
    },
    branchId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Branch",
        required: false,
    },
    departmentId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Department",
        required: false,
    },
    designationId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Designation",
        required: false,
    },
    managerId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User", // reporting manager
        default: null,
    },
    costCenterId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "CostCenter",
        default: null,
    },
    employmentType: {
        type: String,
        enum: ["Full-Time", "Part-Time", "Intern", "Contract"],
        default: "Full-Time",
    },
    /* ================= PROBATION DETAILS ================= */
    probationPeriod: {
        type: Number, // months (3 / 6)
        default: 6,
    },
    probationEndDate: {
        type: Date,
        default: null,
    },
    confirmationDate: {
        type: Date,
        default: null,
    },
    employmentStatus: {
        type: String,
        enum: ["PROBATION", "CONFIRMED", "TERMINATED"],
        default: "PROBATION",
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE", "LOCKED", "DISABLED"],
        default: "ACTIVE",
    },
    probationMessage: {
        type: String,
        default: null,
    },
    probationJustification: {
        type: String,
        default: null,
    },
    isResigned: {
        type: Boolean,
        default: false,
    },
    isTerminated: {
        type: Boolean,
        default: false,
    },
    terminationDate: {
        type: Date,
        default: null,
    },
    terminationReason: {
        type: String,
        default: null,
    },
    /* ================= STATUTORY & BANK DETAILS ================= */
    pan: { type: String, default: null },
    pfNumber: { type: String, default: null },
    uan: { type: String, default: null },
    bankName: { type: String, default: null },
    bankAccountNumber: { type: String, default: null },
    ifscCode: { type: String, default: null },
    /* ================= LEAVE BALANCES ================= */
    elBalance: { type: Number, default: 0 },
    slBalance: { type: Number, default: 0 },
    /* ================= SYSTEM ================= */
    profilePicture: { type: String, default: null },
    googleId: { type: String, default: null },
    setupToken: { type: String, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetTokenExpiry: { type: Date, default: null },
    /* ================= BILLING ================= */
    activeSince: { type: Date, default: null },
}, { timestamps: true });
// 🔐 hash password only on modified and not hashed
userSchema.pre("save", async function () {
    if (this.isModified("password") && this.password) {
        if (!this.password.startsWith("$2b$")) {
            this.password = await bcrypt_1.default.hash(this.password, 10);
        }
    }
});
// Explicit collection name — CA-Management's own User model also registers as
// "User" and would otherwise collide on the shared "users" collection once both
// apps share one database.
exports.default = mongoose_1.default.model("User", userSchema, "hrms_users");
