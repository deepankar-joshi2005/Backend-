"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWorkstationStatus = exports.releaseDesk = exports.getAllWorkstations = exports.allocateDesk = void 0;
const Workstation_1 = __importDefault(require("../../models/hrms/Workstation"));
/* ================= ALLOCATE DESK ================= */
const allocateDesk = async (req, res) => {
    try {
        const { employeeId, location, building, floor, deskCode, seatType } = req.body;
        // Desk already allocated?
        const existingDesk = await Workstation_1.default.findOne({
            deskCode,
            status: "ALLOCATED",
        });
        if (existingDesk) {
            return res.status(400).json({
                message: "Desk already allocated",
            });
        }
        // Employee already has desk?
        const employeeDesk = await Workstation_1.default.findOne({
            employee: employeeId,
            status: "ALLOCATED",
        });
        if (employeeDesk) {
            return res.status(400).json({
                message: "Employee already has an allocated desk",
            });
        }
        const workstation = await Workstation_1.default.create({
            employee: employeeId,
            location,
            building,
            floor,
            deskCode,
            seatType,
        });
        res.status(201).json({
            message: "Desk allocated successfully",
            data: workstation,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};
exports.allocateDesk = allocateDesk;
/* ================= GET ALL ALLOCATIONS ================= */
const getAllWorkstations = async (req, res) => {
    try {
        const data = await Workstation_1.default.find()
            .populate("employee", "name role email departmentId")
            .sort({ createdAt: -1 });
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};
exports.getAllWorkstations = getAllWorkstations;
/* ================= RELEASE DESK ================= */
const releaseDesk = async (req, res) => {
    try {
        const { id } = req.params;
        const workstation = await Workstation_1.default.findById(id);
        if (!workstation) {
            return res.status(404).json({
                message: "Workstation not found",
            });
        }
        workstation.status = "RELEASED";
        workstation.releasedAt = new Date();
        await workstation.save();
        res.json({
            message: "Desk released successfully",
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};
exports.releaseDesk = releaseDesk;
/* ================= UPDATE WORKSTATION STATUS ================= */
const updateWorkstationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // Validate status
        if (!["ALLOCATED", "RELEASED"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status value",
            });
        }
        const workstation = await Workstation_1.default.findById(id);
        if (!workstation) {
            return res.status(404).json({
                message: "Workstation not found",
            });
        }
        // If already released
        if (workstation.status === "RELEASED" && status === "RELEASED") {
            return res.status(400).json({
                message: "Desk already released",
            });
        }
        workstation.status = status;
        // Set releasedAt only when deallocating
        if (status === "RELEASED") {
            workstation.releasedAt = new Date();
        }
        else {
            workstation.releasedAt = undefined;
        }
        await workstation.save();
        res.json({
            message: "Status updated successfully",
            data: workstation,
        });
    }
    catch (error) {
        console.error("UPDATE WORKSTATION STATUS ERROR:", error);
        res.status(500).json({ message: "Server Error" });
    }
};
exports.updateWorkstationStatus = updateWorkstationStatus;
