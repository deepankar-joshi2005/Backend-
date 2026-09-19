"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAppraisal = exports.updateAppraisal = exports.getAppraisalById = exports.getAppraisals = exports.createAppraisal = void 0;
const Appraisal_1 = __importDefault(require("../../models/hrms/Appraisal"));
/* ================= CREATE ================= */
const createAppraisal = async (req, res) => {
    try {
        const appraisal = await Appraisal_1.default.create({
            ...req.body,
            createdBy: req.user.id,
        });
        res.status(201).json(appraisal);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create appraisal", error });
    }
};
exports.createAppraisal = createAppraisal;
/* ================= GET ALL ================= */
const getAppraisals = async (_req, res) => {
    try {
        const list = await Appraisal_1.default.find().sort({ createdAt: -1 });
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch appraisals" });
    }
};
exports.getAppraisals = getAppraisals;
/* ================= GET BY ID ================= */
const getAppraisalById = async (req, res) => {
    try {
        const appraisal = await Appraisal_1.default.findById(req.params.id);
        if (!appraisal) {
            return res.status(404).json({ message: "Appraisal not found" });
        }
        res.json(appraisal);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch appraisal" });
    }
};
exports.getAppraisalById = getAppraisalById;
/* ================= UPDATE ================= */
const updateAppraisal = async (req, res) => {
    try {
        const updated = await Appraisal_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!updated) {
            return res.status(404).json({ message: "Appraisal not found" });
        }
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update appraisal" });
    }
};
exports.updateAppraisal = updateAppraisal;
/* ================= DELETE ================= */
const deleteAppraisal = async (req, res) => {
    try {
        const deleted = await Appraisal_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "Appraisal not found" });
        }
        res.json({ message: "Appraisal deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete appraisal" });
    }
};
exports.deleteAppraisal = deleteAppraisal;
