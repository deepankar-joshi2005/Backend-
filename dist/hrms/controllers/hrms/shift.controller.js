"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShift = exports.updateShift = exports.bulkAssignShift = exports.assignShift = exports.getShiftsByWeek = void 0;
const ShiftAssignment_1 = __importDefault(require("../../models/hrms/ShiftAssignment"));
const email_1 = require("../../utils/email");
const User_1 = __importDefault(require("../../models/User"));
/* ===============================
   GET SHIFTS BY WEEK
   =============================== */
const getShiftsByWeek = async (req, res) => {
    try {
        const { start, page = "1", limit = "15" } = req.query;
        if (!start) {
            return res.status(400).json({ message: "Week start date required" });
        }
        const pageNum = Math.max(Number(page), 1);
        const limitNum = Math.max(Number(limit), 1);
        const startDate = new Date(start);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        const filter = {
            date: {
                $gte: startDate.toISOString().split("T")[0],
                $lte: endDate.toISOString().split("T")[0],
            },
        };
        const totalShifts = await ShiftAssignment_1.default.countDocuments(filter);
        const totalPages = Math.max(Math.ceil(totalShifts / limitNum), 1);
        // ⛔ page out of range → last valid page
        const safePage = pageNum > totalPages ? totalPages : pageNum;
        const skip = (safePage - 1) * limitNum;
        const shifts = await ShiftAssignment_1.default.find(filter)
            .sort({ date: 1, createdAt: 1 }) // ✅ stable ordering
            .skip(skip)
            .limit(limitNum)
            .lean();
        res.json({
            page: safePage,
            limit: limitNum,
            totalShifts,
            totalPages,
            shifts,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch shifts" });
    }
};
exports.getShiftsByWeek = getShiftsByWeek;
/* ===============================
   ASSIGN SHIFT (SINGLE)
   =============================== */
const assignShift = async (req, res) => {
    try {
        const { userId, date, shift } = req.body;
        const record = await ShiftAssignment_1.default.findOneAndUpdate({ userId, date }, { shift }, { new: true, upsert: true });
        // 🔹 Get user details
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // 📧 EMAIL — SHIFT ASSIGNED (best-effort — must not fail the request if it errors)
        if (user.email) {
            try {
                await (0, email_1.sendCommonEmail)({
                    to: user.email,
                    name: user.name,
                    type: email_1.CommonEmailType.SHIFT_ASSIGNED,
                    data: {
                        shift: shift,
                        date: date,
                    },
                });
            }
            catch (emailError) {
                console.error(`Failed to send shift email to ${user.email}:`, emailError);
            }
        }
        res.json({
            message: "Shift assigned successfully",
            data: record,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to assign shift" });
    }
};
exports.assignShift = assignShift;
/* ===============================
   BULK ASSIGN SHIFTS
   =============================== */
const bulkAssignShift = async (req, res) => {
    try {
        const { userIds, date, shift } = req.body;
        if (!(userIds === null || userIds === void 0 ? void 0 : userIds.length)) {
            return res.status(400).json({ message: "User list required" });
        }
        const operations = userIds.map((userId) => ({
            updateOne: {
                filter: { userId, date },
                update: { userId, date, shift },
                upsert: true,
            },
        }));
        await ShiftAssignment_1.default.bulkWrite(operations);
        // 📧 EMAIL ALL USERS (best-effort — must not fail the request if it errors)
        const users = await User_1.default.find({ _id: { $in: userIds } });
        for (const user of users) {
            if (user.email) {
                try {
                    await (0, email_1.sendCommonEmail)({
                        to: user.email,
                        name: user.name,
                        type: email_1.CommonEmailType.SHIFT_ASSIGNED,
                        data: {
                            shift: shift,
                            date: date,
                        },
                    });
                }
                catch (emailError) {
                    console.error(`Failed to send shift email to ${user.email}:`, emailError);
                }
            }
        }
        res.json({ message: "Shifts assigned successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Bulk shift assign failed" });
    }
};
exports.bulkAssignShift = bulkAssignShift;
/* ===============================
   UPDATE SHIFT
   =============================== */
const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { shift } = req.body;
        const updated = await ShiftAssignment_1.default.findByIdAndUpdate(id, { shift }, { new: true });
        if (!updated) {
            return res.status(404).json({ message: "Shift assignment not found" });
        }
        // 🔹 Get user
        const user = await User_1.default.findById(updated.userId);
        if (user === null || user === void 0 ? void 0 : user.email) {
            // 📧 SHIFT UPDATED MAIL (best-effort — must not fail the request if it errors)
            try {
                await (0, email_1.sendCommonEmail)({
                    type: email_1.CommonEmailType.SHIFT_ASSIGNED, // reuse same template
                    to: user.email,
                    name: user.name,
                    data: {
                        shift: shift,
                        date: updated.date,
                        updated: true, // optional flag
                    },
                });
            }
            catch (emailError) {
                console.error(`Failed to send shift update email to ${user.email}:`, emailError);
            }
        }
        res.json({
            message: "Shift updated successfully",
            data: updated,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update shift" });
    }
};
exports.updateShift = updateShift;
/* ===============================
   DELETE SHIFT
   =============================== */
const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ShiftAssignment_1.default.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Shift assignment not found" });
        }
        res.json({
            message: "Shift deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete shift" });
    }
};
exports.deleteShift = deleteShift;
