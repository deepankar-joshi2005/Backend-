"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSoftware = exports.getAssignedSoftware = exports.assignSoftware = void 0;
const SoftwearManagement_1 = __importDefault(require("../../models/hrms/SoftwearManagement"));
/* ---------------- ASSIGN SOFTWARE ---------------- */
const assignSoftware = async (req, res) => {
    try {
        const { userId, software, licenseKey, expiryDate, remarks } = req.body;
        if (!userId || !software) {
            return res.status(400).json({
                message: "User and Software are required",
            });
        }
        const assignment = await SoftwearManagement_1.default.create({
            user: userId,
            software,
            licenseKey,
            expiryDate,
            remarks,
        });
        res.status(201).json({
            message: "Software assigned successfully",
            data: assignment,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.assignSoftware = assignSoftware;
/* ---------------- GET ALL ASSIGNED SOFTWARE ---------------- */
const getAssignedSoftware = async (_req, res) => {
    try {
        const assignments = await SoftwearManagement_1.default.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });
        res.json(assignments);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.getAssignedSoftware = getAssignedSoftware;
/* ---------------- REVOKE SOFTWARE ---------------- */
const revokeSoftware = async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await SoftwearManagement_1.default.findByIdAndUpdate(id, { status: "REVOKED" }, { new: true });
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found" });
        }
        res.json({
            message: "Software revoked successfully",
            data: assignment,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.revokeSoftware = revokeSoftware;
