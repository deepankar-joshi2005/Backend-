"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disposeAssetForEmployee = exports.assignNonITAsset = exports.markAssetDamaged = exports.deleteAsset = exports.updateAsset = exports.getAssetById = exports.getAllAssets = exports.createAsset = void 0;
const NonITAsset_1 = __importDefault(require("../../models/hrms/NonITAsset"));
const mongoose_1 = __importDefault(require("mongoose"));
/* ================= CREATE ASSET ================= */
const createAsset = async (req, res) => {
    try {
        const asset = await NonITAsset_1.default.create(req.body);
        res.status(201).json(asset);
    }
    catch (err) {
        res.status(400).json({
            message: err.message || "Failed to create asset",
        });
    }
};
exports.createAsset = createAsset;
/* ================= GET ALL ASSETS ================= */
const getAllAssets = async (_req, res) => {
    try {
        const assets = await NonITAsset_1.default.find()
            .populate({
            path: "assignedTo.user",
            select: "name role employeeCode",
        })
            .sort({ createdAt: -1 });
        res.json(assets);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch assets" });
    }
};
exports.getAllAssets = getAllAssets;
/* ================= GET SINGLE ASSET ================= */
const getAssetById = async (req, res) => {
    try {
        const asset = await NonITAsset_1.default.findById(req.params.id).populate("assignedTo", "name role employeeCode");
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }
        res.json(asset);
    }
    catch {
        res.status(400).json({ message: "Invalid asset ID" });
    }
};
exports.getAssetById = getAssetById;
/* ================= UPDATE ASSET ================= */
const updateAsset = async (req, res) => {
    try {
        const asset = await NonITAsset_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }
        res.json(asset);
    }
    catch {
        res.status(400).json({ message: "Failed to update asset" });
    }
};
exports.updateAsset = updateAsset;
/* ================= DELETE ASSET ================= */
const deleteAsset = async (req, res) => {
    try {
        const asset = await NonITAsset_1.default.findByIdAndDelete(req.params.id);
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }
        res.json({ message: "Asset deleted successfully" });
    }
    catch {
        res.status(400).json({ message: "Failed to delete asset" });
    }
};
exports.deleteAsset = deleteAsset;
/* ================= MARK ASSET DAMAGED ================= */
const markAssetDamaged = async (req, res) => {
    try {
        const { count } = req.body;
        if (!count || count <= 0) {
            return res.status(400).json({
                message: "Damaged count must be greater than 0",
            });
        }
        const asset = await NonITAsset_1.default.findById(req.params.id);
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }
        const assigned = Array.isArray(asset.assignedTo)
            ? asset.assignedTo.length
            : asset.assignedTo
                ? 1
                : 0;
        const issuedCount = assigned;
        const available = asset.quantity - issuedCount - (asset.damagedCount || 0);
        if (count > available) {
            return res.status(400).json({
                message: "Damaged count exceeds available quantity",
            });
        }
        asset.damagedCount = (asset.damagedCount || 0) + count;
        // optional: status update
        if (asset.damagedCount === asset.quantity) {
            asset.status = "DISPOSED";
        }
        else {
            asset.status = "DAMAGED";
        }
        await asset.save();
        res.json({
            message: "Asset marked as damaged successfully",
            asset,
        });
    }
    catch (err) {
        res.status(400).json({
            message: err.message || "Failed to mark asset as damaged",
        });
    }
};
exports.markAssetDamaged = markAssetDamaged;
/* ================= ASSIGN NON-IT ASSET ================= */
const assignNonITAsset = async (req, res) => {
    try {
        const { userId, quantity } = req.body;
        const asset = await NonITAsset_1.default.findById(req.params.id);
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }
        /* 🔒 NULL SAFE */
        if (!asset.assignedTo) {
            asset.assignedTo = [];
        }
        const issuedQty = asset.assignedTo.reduce((sum, a) => sum + a.quantity, 0);
        const availableQty = asset.quantity - issuedQty - asset.damagedCount;
        if (quantity > availableQty) {
            return res
                .status(400)
                .json({ message: `Only ${availableQty} available` });
        }
        const existing = asset.assignedTo.find((a) => a.user.toString() === userId);
        if (existing) {
            existing.quantity += quantity;
        }
        else {
            asset.assignedTo.push({
                user: new mongoose_1.default.Types.ObjectId(userId),
                quantity,
            });
        }
        asset.status = "ASSIGNED";
        await asset.save();
        const newIssuedQty = asset.assignedTo.reduce((sum, a) => sum + a.quantity, 0);
        res.json({
            message: "Asset assigned successfully",
            assignedTo: asset.assignedTo,
            issuedQty: newIssuedQty,
            availableQty: asset.quantity - newIssuedQty - asset.damagedCount,
        });
    }
    catch (err) {
        console.error("ASSIGN ERROR:", err);
        res.status(500).json({ message: "Assign failed" });
    }
};
exports.assignNonITAsset = assignNonITAsset;
/* ================= DISPOSE ASSET FOR EMPLOYEE ================= */
const disposeAssetForEmployee = async (req, res) => {
    try {
        const { assetId } = req.params;
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }
        const asset = await NonITAsset_1.default.findById(assetId);
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }
        if (!asset.assignedTo || asset.assignedTo.length === 0) {
            return res.status(400).json({
                message: "No assignments found for this asset",
            });
        }
        /* 🔥 FIND EMPLOYEE ASSIGNMENT */
        const assignmentIndex = asset.assignedTo.findIndex((a) => a.user.toString() === userId);
        if (assignmentIndex === -1) {
            return res.status(404).json({
                message: "This employee does not have this asset assigned",
            });
        }
        /* 🔥 REMOVE EMPLOYEE ASSIGNMENT (DISPOSE) */
        const disposedQuantity = asset.assignedTo[assignmentIndex].quantity;
        asset.assignedTo.splice(assignmentIndex, 1);
        /* 🔥 STATUS LOGIC */
        if (asset.assignedTo.length === 0) {
            asset.status = "DISPOSED";
        }
        else {
            asset.status = "ASSIGNED";
        }
        await asset.save();
        res.json({
            message: "Asset disposed for employee successfully",
            disposedQuantity,
            remainingAssignments: asset.assignedTo,
            assetStatus: asset.status,
        });
    }
    catch (error) {
        console.error("DISPOSE ERROR:", error);
        res.status(500).json({ message: "Dispose failed" });
    }
};
exports.disposeAssetForEmployee = disposeAssetForEmployee;
