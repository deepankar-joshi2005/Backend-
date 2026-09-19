"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteJobOpeningById = exports.closeJobOpening = exports.updateJobOpening = exports.getJobOpeningById = exports.getAllJobOpenings = exports.addJobOpening = void 0;
const JobOpenings_1 = __importDefault(require("../../models/hrms/JobOpenings"));
/**
 * ➕ Add Job Opening
 */
const addJobOpening = async (req, res) => {
    try {
        const { jobTitle, department, location, openings, recruitingManager } = req.body;
        if (!jobTitle || !department || !location || !openings) {
            return res.status(400).json({
                message: "Job title, department and location are required",
            });
        }
        const jobData = {
            jobTitle,
            department,
            location,
            openings,
            recruitingManager,
        };
        if (req.file) {
            jobData.jobDocument = req.file.path.replace(/\\/g, "/");
        }
        const job = await JobOpenings_1.default.create(jobData);
        res.status(201).json({
            message: "Job opening added successfully",
            job,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to add job opening",
            error: error.message,
        });
    }
};
exports.addJobOpening = addJobOpening;
/**
 * 📋 Get All Job Openings
 */
const getAllJobOpenings = async (_req, res) => {
    try {
        const jobs = await JobOpenings_1.default.find().populate("recruitingManager", "name email").sort({ createdAt: -1 });
        res.json(jobs);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch job openings",
            error: error.message,
        });
    }
};
exports.getAllJobOpenings = getAllJobOpenings;
/**
 * 🔍 Get Job Opening By ID
 */
const getJobOpeningById = async (req, res) => {
    try {
        const job = await JobOpenings_1.default.findById(req.params.id).populate("recruitingManager", "name email");
        if (!job) {
            return res.status(404).json({ message: "Job opening not found" });
        }
        res.json(job);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch job opening",
            error: error.message,
        });
    }
};
exports.getJobOpeningById = getJobOpeningById;
/**
 * ✏️ Update Job Opening
 */
const updateJobOpening = async (req, res) => {
    try {
        const { jobTitle, department, location, openings, status, recruitingManager } = req.body;
        const updateData = {};
        if (jobTitle)
            updateData.jobTitle = jobTitle;
        if (department)
            updateData.department = department;
        if (location)
            updateData.location = location;
        if (openings !== undefined)
            updateData.openings = openings;
        if (status)
            updateData.status = status;
        if (recruitingManager)
            updateData.recruitingManager = recruitingManager;
        if (req.file) {
            updateData.jobDocument = req.file.path.replace(/\\/g, "/");
        }
        const job = await JobOpenings_1.default.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        });
        if (!job) {
            return res.status(404).json({ message: "Job opening not found" });
        }
        res.json({
            message: "Job opening updated successfully",
            job,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update job opening",
            error: error.message,
        });
    }
};
exports.updateJobOpening = updateJobOpening;
/**
 * ❌ Close Job Opening
 */
const closeJobOpening = async (req, res) => {
    try {
        const job = await JobOpenings_1.default.findByIdAndUpdate(req.params.id, { status: "Closed" }, { new: true });
        if (!job) {
            return res.status(404).json({ message: "Job opening not found" });
        }
        res.json({
            message: "Job opening closed successfully",
            job,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to close job opening",
            error: error.message,
        });
    }
};
exports.closeJobOpening = closeJobOpening;
/**
 * 🗑️ Delete Job Opening
 */
const deleteJobOpeningById = async (req, res) => {
    try {
        const job = await JobOpenings_1.default.findByIdAndDelete(req.params.id);
        if (!job) {
            return res.status(404).json({ message: "Job opening not found" });
        }
        res.json({ message: "Job opening deleted successfully" });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to delete job opening",
            error: error.message,
        });
    }
};
exports.deleteJobOpeningById = deleteJobOpeningById;
