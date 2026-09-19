import { Response } from "express";
import Holiday from "../../models/hrms/Holiday";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

/**
 * ➕ Add Holiday
 */
export const addHoliday = async (req: AuthRequest, res: Response) => {
    try {
        const { title, date } = req.body;

        if (!title || !date) {
            return res.status(400).json({
                message: "Holiday title and date are required",
            });
        }

        const holidayDate = new Date(date);
        const day = holidayDate.toLocaleDateString("en-US", {
            weekday: "long",
        });

        const holiday = await Holiday.create({
            title,
            date: holidayDate,
            day,
            companyId: (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId, // Auto-set if not system admin
        });

        res.status(201).json({
            message: "Holiday added successfully",
            holiday,
        });
    } catch (error: any) {
        console.error("Add holiday error:", error);
        res.status(500).json({
            message: "Failed to add holiday",
            error: error.message,
        });
    }
};

/**
 * 📋 Get All Holidays
 */
export const getAllHolidays = async (req: AuthRequest, res: Response) => {
    try {
        const filter: any = {};
        
        // Multi-tenancy filtering
        if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }

        const holidays = await Holiday.find(filter).sort({ date: 1 });

        res.json(holidays);
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to fetch holidays",
            error: error.message,
        });
    }
};

/**
 * 🔍 Get Holiday By ID
 */
export const getHolidayById = async (req: AuthRequest, res: Response) => {
    try {
        const holiday = await Holiday.findById(req.params.id);

        if (!holiday) {
            return res.status(404).json({ message: "Holiday not found" });
        }

        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && holiday.companyId?.toString() !== req.user.companyId?.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        res.json(holiday);
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to fetch holiday",
            error: error.message,
        });
    }
};

/**
 * ✏️ Update Holiday
 */
export const updateHoliday = async (req: AuthRequest, res: Response) => {
    try {
        const { title, date } = req.body;

        const existingHoliday = await Holiday.findById(req.params.id);
        if (!existingHoliday) {
            return res.status(404).json({ message: "Holiday not found" });
        }

        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && existingHoliday.companyId?.toString() !== req.user.companyId?.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        const updateData: any = {};
        if (title) updateData.title = title;
        if (date) {
            updateData.date = date;
            updateData.day = new Date(date).toLocaleDateString("en-US", {
                weekday: "long",
            });
        }

        const holiday = await Holiday.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        });

        res.json({
            message: "Holiday updated successfully",
            holiday,
        });
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to update holiday",
            error: error.message,
        });
    }
};

/**
 * 🗑️ Delete Holiday By ID
 */
export const deleteHolidayById = async (req: AuthRequest, res: Response) => {
    try {
        const existingHoliday = await Holiday.findById(req.params.id);
        if (!existingHoliday) {
            return res.status(404).json({ message: "Holiday not found" });
        }

        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && existingHoliday.companyId?.toString() !== req.user.companyId?.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        await Holiday.findByIdAndDelete(req.params.id);

        res.json({ message: "Holiday deleted successfully" });
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to delete holiday",
            error: error.message,
        });
    }
};
