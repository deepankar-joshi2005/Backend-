import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import Escalation from "../../models/hrms/Escalation";

/* ======================================================
   CREATE ESCALATION (HR Admin / Admin)
   ====================================================== */
export const createEscalation = async (req: AuthRequest, res: Response) => {
    try {
        const { module, employeeName, description, screenshot, priority } = req.body;

        const escalation = await Escalation.create({
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to raise escalation" });
    }
};

/* ======================================================
   GET ALL ESCALATIONS (Super Admin)
   ====================================================== */
export const getAllEscalations = async (req: AuthRequest, res: Response) => {
    try {
        const escalations = await Escalation.find()
            .populate("raisedBy", "name role email")
            .populate("resolvedBy", "name role")
            .sort({ createdAt: -1 });

        res.json(escalations);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch escalations" });
    }
};

/* ======================================================
   UPDATE ESCALATION STATUS (Super Admin)
   ====================================================== */
export const updateEscalationStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, comments } = req.body;

        const escalation = await Escalation.findById(id);
        if (!escalation) {
            return res.status(404).json({ message: "Escalation not found" });
        }

        escalation.status = status;
        if (comments) escalation.comments = comments;
        if (status === "RESOLVED" || status === "REJECTED") {
            escalation.resolvedBy = req.user.id as any;
        }

        await escalation.save();

        res.json({
            message: `Escalation marked as ${status}`,
            escalation,
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to update escalation status" });
    }
};

/* ======================================================
   GET MY ESCALATIONS (HR Admin)
   ====================================================== */
export const getMyEscalations = async (req: AuthRequest, res: Response) => {
    try {
        const escalations = await Escalation.find({ raisedBy: req.user.id })
            .populate("resolvedBy", "name role")
            .sort({ createdAt: -1 });

        res.json(escalations);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch your escalations" });
    }
};
