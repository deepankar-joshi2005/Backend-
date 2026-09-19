"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteParkingAssignment = exports.updateParkingAssignment = exports.getParkingAssignmentById = exports.getParkingAssignments = exports.createParkingAssignment = void 0;
const ParkingAssignment_1 = __importDefault(require("../../models/hrms/ParkingAssignment"));
/* ================= CREATE ================= */
const createParkingAssignment = async (req, res) => {
    try {
        const assignment = await ParkingAssignment_1.default.create(req.body);
        res.status(201).json(assignment);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to allocate parking", error });
    }
};
exports.createParkingAssignment = createParkingAssignment;
/* ================= GET ALL ================= */
const getParkingAssignments = async (req, res) => {
    try {
        const data = await ParkingAssignment_1.default.find()
            .populate("employee", "name role employeeCode")
            .sort({ createdAt: -1 });
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch data", error });
    }
};
exports.getParkingAssignments = getParkingAssignments;
/* ================= GET BY ID ================= */
const getParkingAssignmentById = async (req, res) => {
    try {
        const assignment = await ParkingAssignment_1.default.findById(req.params.id).populate("employee", "name role employeeCode");
        if (!assignment)
            return res.status(404).json({ message: "Record not found" });
        res.json(assignment);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching record", error });
    }
};
exports.getParkingAssignmentById = getParkingAssignmentById;
/* ================= UPDATE ================= */
const updateParkingAssignment = async (req, res) => {
    try {
        const updated = await ParkingAssignment_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate("employee", "name role employeeCode");
        if (!updated)
            return res.status(404).json({ message: "Record not found" });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update", error });
    }
};
exports.updateParkingAssignment = updateParkingAssignment;
/* ================= DELETE ================= */
const deleteParkingAssignment = async (req, res) => {
    try {
        const deleted = await ParkingAssignment_1.default.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ message: "Record not found" });
        res.json({ message: "Parking allocation deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete", error });
    }
};
exports.deleteParkingAssignment = deleteParkingAssignment;
