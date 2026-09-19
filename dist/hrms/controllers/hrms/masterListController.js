"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTaxSlab = exports.updateTaxSlab = exports.getTaxSlabs = exports.createTaxSlab = exports.deleteMasterItem = exports.updateMasterItem = exports.getMasterItems = exports.createMasterItem = void 0;
const MasterList_1 = __importDefault(require("../../models/hrms/MasterList"));
const TaxSlab_1 = __importDefault(require("../../models/hrms/TaxSlab"));
/* ================= MASTER LIST ITEMS ================= */
const createMasterItem = async (req, res) => {
    try {
        const item = await MasterList_1.default.create(req.body);
        res.status(201).json({ message: "Item created successfully", item });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create item", error: error.message });
    }
};
exports.createMasterItem = createMasterItem;
const getMasterItems = async (req, res) => {
    try {
        const { type } = req.query;
        const items = await MasterList_1.default.find(type ? { type } : {}).sort({ createdAt: -1 });
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch items", error: error.message });
    }
};
exports.getMasterItems = getMasterItems;
const updateMasterItem = async (req, res) => {
    try {
        const item = await MasterList_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item)
            return res.status(404).json({ message: "Item not found" });
        res.json({ message: "Item updated successfully", item });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update item", error: error.message });
    }
};
exports.updateMasterItem = updateMasterItem;
const deleteMasterItem = async (req, res) => {
    try {
        const item = await MasterList_1.default.findByIdAndDelete(req.params.id);
        if (!item)
            return res.status(404).json({ message: "Item not found" });
        res.json({ message: "Item deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete item", error: error.message });
    }
};
exports.deleteMasterItem = deleteMasterItem;
/* ================= TAX SLABS ================= */
const createTaxSlab = async (req, res) => {
    try {
        const slab = await TaxSlab_1.default.create(req.body);
        res.status(201).json({ message: "Tax slab created successfully", slab });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create tax slab", error: error.message });
    }
};
exports.createTaxSlab = createTaxSlab;
const getTaxSlabs = async (_req, res) => {
    try {
        const slabs = await TaxSlab_1.default.find().sort({ minIncome: 1 });
        res.json(slabs);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch tax slabs", error: error.message });
    }
};
exports.getTaxSlabs = getTaxSlabs;
const updateTaxSlab = async (req, res) => {
    try {
        const slab = await TaxSlab_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!slab)
            return res.status(404).json({ message: "Tax slab not found" });
        res.json({ message: "Tax slab updated successfully", slab });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update tax slab", error: error.message });
    }
};
exports.updateTaxSlab = updateTaxSlab;
const deleteTaxSlab = async (req, res) => {
    try {
        const slab = await TaxSlab_1.default.findByIdAndDelete(req.params.id);
        if (!slab)
            return res.status(404).json({ message: "Tax slab not found" });
        res.json({ message: "Tax slab deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete tax slab", error: error.message });
    }
};
exports.deleteTaxSlab = deleteTaxSlab;
