"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyEscalations = exports.updateEscalationStatus = exports.getAllEscalations = exports.createEscalation = void 0;
const Escalation_1 = __importDefault(require("../../models/hrms/Escalation"));
/* ======================================================
   CREATE ESCALATION (HR Admin / Admin)
   ====================================================== */
const createEscalation = async (req, res) => {
    try {
        const { module, employeeName, description, screenshot, priority } = req.body;
        const escalation = await Escalation_1.default.create({
            raisedBy: req.user.id,
            module,
            employeeName,
            description,
            screenshot,
            priority,
        });
        res.status(201).json({
            message: "Escalation raised successfully",
            escalation,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to raise escalation" });
    }
};
exports.createEscalation = createEscalation;
/* ======================================================
   GET ALL ESCALATIONS (Super Admin)
   ====================================================== */
const getAllEscalations = async (req, res) => {
    try {
        const escalations = await Escalation_1.default.find()
            .populate("raisedBy", "name role email")
            .populate("resolvedBy", "name role")
            .sort({ createdAt: -1 });
        res.json(escalations);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch escalations" });
    }
};
exports.getAllEscalations = getAllEscalations;
/* ======================================================
   UPDATE ESCALATION STATUS (Super Admin)
   ====================================================== */
const updateEscalationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comments } = req.body;
        const escalation = await Escalation_1.default.findById(id);
        if (!escalation) {
            return res.status(404).json({ message: "Escalation not found" });
        }
        escalation.status = status;
        if (comments)
            escalation.comments = comments;
        if (status === "RESOLVED" || status === "REJECTED") {
            escalation.resolvedBy = req.user.id;
        }
        await escalation.save();
        res.json({
            message: `Escalation marked as ${status}`,
            escalation,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update escalation status" });
    }
};
exports.updateEscalationStatus = updateEscalationStatus;
/* ======================================================
   GET MY ESCALATIONS (HR Admin)
   ====================================================== */
const getMyEscalations = async (req, res) => {
    try {
        const escalations = await Escalation_1.default.find({ raisedBy: req.user.id })
            .populate("resolvedBy", "name role")
            .sort({ createdAt: -1 });
        res.json(escalations);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch your escalations" });
    }
};
exports.getMyEscalations = getMyEscalations;
