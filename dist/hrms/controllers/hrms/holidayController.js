"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHolidayById = exports.updateHoliday = exports.getHolidayById = exports.getAllHolidays = exports.addHoliday = void 0;
const Holiday_1 = __importDefault(require("../../models/hrms/Holiday"));
const constants_1 = require("../../constants");
/**
 * ➕ Add Holiday
 */
const addHoliday = async (req, res) => {
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
        const holiday = await Holiday_1.default.create({
            title,
            date: holidayDate,
            day,
            companyId: (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) ? req.user.companyId : req.body.companyId, // Auto-set if not system admin
        });
        res.status(201).json({
            message: "Holiday added successfully",
            holiday,
        });
    }
    catch (error) {
        console.error("Add holiday error:", error);
        res.status(500).json({
            message: "Failed to add holiday",
            error: error.message,
        });
    }
};
exports.addHoliday = addHoliday;
/**
 * 📋 Get All Holidays
 */
const getAllHolidays = async (req, res) => {
    try {
        const filter = {};
        // Multi-tenancy filtering
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        const holidays = await Holiday_1.default.find(filter).sort({ date: 1 });
        res.json(holidays);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch holidays",
            error: error.message,
        });
    }
};
exports.getAllHolidays = getAllHolidays;
/**
 * 🔍 Get Holiday By ID
 */
const getHolidayById = async (req, res) => {
    var _a, _b;
    try {
        const holiday = await Holiday_1.default.findById(req.params.id);
        if (!holiday) {
            return res.status(404).json({ message: "Holiday not found" });
        }
        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = holiday.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        res.json(holiday);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch holiday",
            error: error.message,
        });
    }
};
exports.getHolidayById = getHolidayById;
/**
 * ✏️ Update Holiday
 */
const updateHoliday = async (req, res) => {
    var _a, _b;
    try {
        const { title, date } = req.body;
        const existingHoliday = await Holiday_1.default.findById(req.params.id);
        if (!existingHoliday) {
            return res.status(404).json({ message: "Holiday not found" });
        }
        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = existingHoliday.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        const updateData = {};
        if (title)
            updateData.title = title;
        if (date) {
            updateData.date = date;
            updateData.day = new Date(date).toLocaleDateString("en-US", {
                weekday: "long",
            });
        }
        const holiday = await Holiday_1.default.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        });
        res.json({
            message: "Holiday updated successfully",
            holiday,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update holiday",
            error: error.message,
        });
    }
};
exports.updateHoliday = updateHoliday;
/**
 * 🗑️ Delete Holiday By ID
 */
const deleteHolidayById = async (req, res) => {
    var _a, _b;
    try {
        const existingHoliday = await Holiday_1.default.findById(req.params.id);
        if (!existingHoliday) {
            return res.status(404).json({ message: "Holiday not found" });
        }
        // Access check
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && ((_a = existingHoliday.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: "Access denied." });
        }
        await Holiday_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Holiday deleted successfully" });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to delete holiday",
            error: error.message,
        });
    }
};
exports.deleteHolidayById = deleteHolidayById;
