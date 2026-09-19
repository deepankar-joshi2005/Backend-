import { Request, Response } from "express";
import CostCenter from "../../models/hrms/CostCenter";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

/**
 * ➕ CREATE COST CENTER
 */
export const createCostCenter = async (req: AuthRequest, res: Response) => {
    try {
        if (req.body.departmentId === "" || req.body.departmentId === null) {
            delete req.body.departmentId;
        }

        const { code } = req.body;
        const existing = await CostCenter.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ message: "Cost Center code already exists" });
        }

        const costCenterData = {
            ...req.body,
            companyId: (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId,
        };

        const costCenter = await CostCenter.create(costCenterData);
        res.status(201).json({
            message: "Cost Center created successfully",
            costCenter,
        });
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to create cost center",
            error: error.message,
        });
    }
};

/**
 * 📋 GET ALL COST CENTERS (supports filtering by companyId, branchId, status)
 */
export const getCostCenters = async (req: AuthRequest, res: Response) => {
    try {
        const { companyId, branchId, departmentId, status } = req.query;
        const filter: any = {};

        if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        } else if (companyId) {
            filter.companyId = companyId;
        }

        if (branchId) filter.branchId = branchId;
        if (departmentId) filter.departmentId = departmentId;
        if (status) filter.status = status;

        const costCenters = await CostCenter.find(filter)
            .populate("companyId", "name")
            .populate("branchId", "name")
            .populate("departmentId", "name")
            .sort({ createdAt: -1 });

        res.json(costCenters);
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to fetch cost centers",
            error: error.message,
        });
    }
};

/**
 * 🔍 GET COST CENTER BY ID
 */
export const getCostCenterById = async (req: AuthRequest, res: Response) => {
    try {
        const costCenter = await CostCenter.findById(req.params.id)
            .populate("companyId", "name")
            .populate("branchId", "name")
            .populate("departmentId", "name");

        if (!costCenter) {
            return res.status(404).json({ message: "Cost Center not found" });
        }

        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && costCenter.companyId?._id?.toString() !== req.user.companyId?.toString()) {
            // Check both populated and unpopulated just in case
            const companyIdStr = (costCenter.companyId as any)?._id?.toString() || costCenter.companyId?.toString();
            if (companyIdStr !== req.user.companyId?.toString()) {
                return res.status(403).json({ message: "Access denied." });
            }
        }

        res.json(costCenter);
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to fetch cost center",
            error: error.message,
        });
    }
};

/**
 * ✏️ UPDATE COST CENTER
 */
export const updateCostCenter = async (req: AuthRequest, res: Response) => {
    try {
        const existingCC = await CostCenter.findById(req.params.id);
        if (!existingCC) {
            return res.status(404).json({ message: "Cost Center not found" });
        }

        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && existingCC.companyId?.toString() !== req.user.companyId?.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        if (req.body.departmentId === "" || req.body.departmentId === null) {
            delete req.body.departmentId;
        }

        const costCenter = await CostCenter.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json({
            message: "Cost Center updated successfully",
            costCenter,
        });
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to update cost center",
            error: error.message,
        });
    }
};

/**
 * 🗑️ DELETE COST CENTER
 */
export const deleteCostCenter = async (req: AuthRequest, res: Response) => {
    try {
        const existingCC = await CostCenter.findById(req.params.id);
        if (!existingCC) {
            return res.status(404).json({ message: "Cost Center not found" });
        }

        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && existingCC.companyId?.toString() !== req.user.companyId?.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        await CostCenter.findByIdAndDelete(req.params.id);
        res.json({ message: "Cost Center deleted successfully" });
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to delete cost center",
            error: error.message,
        });
    }
};
