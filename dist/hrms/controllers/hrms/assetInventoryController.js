"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unassignAsset = exports.assignAsset = exports.deleteAsset = exports.updateAsset = exports.getAssetById = exports.getAssets = exports.createAsset = void 0;
const AssetInventory_1 = __importDefault(require("../../models/hrms/AssetInventory"));
/* ---------------- CREATE ASSET ---------------- */
const createAsset = async (req, res) => {
    try {
        const { assetType, serialNumber, warrantyExpiry, accessories, status } = req.body;
        if (!serialNumber) {
            return res.status(400).json({
                message: "Serial number is required",
            });
        }
        const asset = await AssetInventory_1.default.create({
            assetType,
            serialNumber,
            warrantyExpiry,
            accessories,
            status,
        });
        res.status(201).json({
            message: "Asset added successfully",
            data: asset,
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Asset with this serial number already exists",
            });
        }
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.createAsset = createAsset;
/* ---------------- GET ALL ASSETS ---------------- */
const getAssets = async (_req, res) => {
    try {
        const assets = await AssetInventory_1.default.find()
            .populate({
            path: "assignedTo",
            select: "name email", // jo frontend me dikhana ho
        })
            .sort({ createdAt: -1 });
        res.json(assets);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.getAssets = getAssets;
/* ---------------- GET SINGLE ASSET ---------------- */
const getAssetById = async (req, res) => {
    try {
        const asset = await AssetInventory_1.default.findById(req.params.id);
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }
        res.json(asset);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.getAssetById = getAssetById;
/* ---------------- UPDATE ASSET ---------------- */
const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { warrantyExpiry, accessories, status } = req.body;
        const asset = await AssetInventory_1.default.findByIdAndUpdate(id, {
            warrantyExpiry,
            accessories,
            status,
        }, { new: true });
        if (!asset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }
        res.json({
            message: "Asset updated successfully",
            data: asset,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.updateAsset = updateAsset;
/* ---------------- DELETE ASSET ---------------- */
const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await AssetInventory_1.default.findByIdAndDelete(id);
        if (!asset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }
        res.json({
            message: "Asset deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.deleteAsset = deleteAsset;
/* ---------------- ASSIGN / RE-ASSIGN ASSET ---------------- */
const assignAsset = async (req, res) => {
    try {
        const { id } = req.params; // asset id
        const { employeeId } = req.body;
        if (!employeeId) {
            return res.status(400).json({
                message: "Employee ID is required",
            });
        }
        const asset = await AssetInventory_1.default.findById(id);
        if (!asset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }
        asset.assignedTo = employeeId;
        asset.status = "ASSIGNED";
        await asset.save();
        res.json({
            message: "Asset assigned successfully",
            data: asset,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.assignAsset = assignAsset;
/* ---------------- UNASSIGN ASSET ---------------- */
const unassignAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await AssetInventory_1.default.findById(id);
        if (!asset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }
        asset.assignedTo = null;
        asset.status = "AVAILABLE";
        await asset.save();
        res.json({
            message: "Asset unassigned successfully",
            data: asset,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
exports.unassignAsset = unassignAsset;
