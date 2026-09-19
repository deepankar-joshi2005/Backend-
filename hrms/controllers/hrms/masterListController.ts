/** @format */

import { Request, Response } from "express";
import MasterList from "../../models/hrms/MasterList";
import TaxSlab from "../../models/hrms/TaxSlab";

/* ================= MASTER LIST ITEMS ================= */

export const createMasterItem = async (req: Request, res: Response) => {
    try {
        const item = await MasterList.create(req.body);
        res.status(201).json({ message: "Item created successfully", item });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create item", error: error.message });
    }
};

export const getMasterItems = async (req: Request, res: Response) => {
    try {
        const { type } = req.query;
        const items = await MasterList.find(type ? { type } : {}).sort({ createdAt: -1 });
        res.json(items);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch items", error: error.message });
    }
};

export const updateMasterItem = async (req: Request, res: Response) => {
    try {
        const item = await MasterList.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) return res.status(404).json({ message: "Item not found" });
        res.json({ message: "Item updated successfully", item });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update item", error: error.message });
    }
};

export const deleteMasterItem = async (req: Request, res: Response) => {
    try {
        const item = await MasterList.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: "Item not found" });
        res.json({ message: "Item deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete item", error: error.message });
    }
};

/* ================= TAX SLABS ================= */

export const createTaxSlab = async (req: Request, res: Response) => {
    try {
        const slab = await TaxSlab.create(req.body);
        res.status(201).json({ message: "Tax slab created successfully", slab });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create tax slab", error: error.message });
    }
};

export const getTaxSlabs = async (_req: Request, res: Response) => {
    try {
        const slabs = await TaxSlab.find().sort({ minIncome: 1 });
        res.json(slabs);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch tax slabs", error: error.message });
    }
};

export const updateTaxSlab = async (req: Request, res: Response) => {
    try {
        const slab = await TaxSlab.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!slab) return res.status(404).json({ message: "Tax slab not found" });
        res.json({ message: "Tax slab updated successfully", slab });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update tax slab", error: error.message });
    }
};

export const deleteTaxSlab = async (req: Request, res: Response) => {
    try {
        const slab = await TaxSlab.findByIdAndDelete(req.params.id);
        if (!slab) return res.status(404).json({ message: "Tax slab not found" });
        res.json({ message: "Tax slab deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete tax slab", error: error.message });
    }
};
