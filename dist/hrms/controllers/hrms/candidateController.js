"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInterviewFeedback = exports.getCandidatesForManager = exports.deleteCandidate = exports.updateCandidateStatus = exports.updateCandidate = exports.getAllCandidates = exports.addCandidate = void 0;
const Candidate_1 = __importDefault(require("../../models/hrms/Candidate"));
/**
 * ➕ Add Candidate
 */
const addCandidate = async (req, res) => {
    try {
        const { name, email, mobile, jobId, jobTitle, recruitingManager, hiringDate, joiningDate } = req.body;
        if (!name || !email || !jobId || !jobTitle || !mobile || !req.file) {
            return res.status(400).json({
                message: "Name, Email, Mobile, Job, Title and Resume are required",
            });
        }
        const resumeUrl = `/uploads/resumes/${req.file.filename}`;
        const candidate = await Candidate_1.default.create({
            name,
            email,
            jobId,
            jobTitle,
            recruitingManager,
            mobile,
            resumeUrl,
            hiringDate,
            joiningDate,
        });
        res.status(201).json({
            message: "Candidate added successfully",
            candidate,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to add candidate",
            error: error.message,
        });
    }
};
exports.addCandidate = addCandidate;
/**
 * 📋 Get All Candidates
 */
const getAllCandidates = async (_req, res) => {
    try {
        const candidates = await Candidate_1.default.find()
            .populate("jobId", "jobTitle recruitingManager")
            .sort({ createdAt: -1 });
        res.json(candidates);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch candidates",
            error: error.message,
        });
    }
};
exports.getAllCandidates = getAllCandidates;
/**
 * 🔄 Update Candidate
 */
const updateCandidate = async (req, res) => {
    try {
        const { name, email, mobile, jobId, jobTitle, recruitingManager, hiringDate, joiningDate } = req.body;
        const updateData = {
            name,
            email,
            jobId,
            jobTitle,
            recruitingManager,
            mobile,
            hiringDate,
            joiningDate,
        };
        if (req.file) {
            updateData.resumeUrl = `/uploads/resumes/${req.file.filename}`;
        }
        const candidate = await Candidate_1.default.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        });
        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found" });
        }
        res.json({ message: "Candidate updated successfully", candidate });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update candidate",
            error: error.message,
        });
    }
};
exports.updateCandidate = updateCandidate;
/**
 * 🔄 Update Status
 */
const updateCandidateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const candidate = await Candidate_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found" });
        }
        res.json({ message: "Status updated", candidate });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update status",
            error: error.message,
        });
    }
};
exports.updateCandidateStatus = updateCandidateStatus;
/**
 * 🗑️ Delete
 */
const deleteCandidate = async (req, res) => {
    try {
        const candidate = await Candidate_1.default.findByIdAndDelete(req.params.id);
        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found" });
        }
        res.json({ message: "Candidate deleted" });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to delete candidate",
            error: error.message,
        });
    }
};
exports.deleteCandidate = deleteCandidate;
/**
 * 📋 Get Candidates for a specific Manager
 */
const getCandidatesForManager = async (req, res) => {
    try {
        const managerId = req.user.id;
        const candidates = await Candidate_1.default.find({
            $or: [
                { recruitingManager: managerId },
            ]
        }).populate("jobId").sort({ createdAt: -1 });
        res.json(candidates);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch candidates for manager",
            error: error.message,
        });
    }
};
exports.getCandidatesForManager = getCandidatesForManager;
/**
 * 🔄 Update Interview Rounds & Feedback
 */
const updateInterviewFeedback = async (req, res) => {
    try {
        const { applied, shortlisted, hrRound, techRound, offer, hired, feedback, status } = req.body;
        const candidate = await Candidate_1.default.findByIdAndUpdate(req.params.id, {
            applied,
            shortlisted,
            hrRound,
            techRound,
            offer,
            hired,
            feedback,
            status
        }, { new: true });
        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found" });
        }
        res.json({ message: "Interview feedback updated", candidate });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update interview feedback",
            error: error.message,
        });
    }
};
exports.updateInterviewFeedback = updateInterviewFeedback;
