/** @format */

import { Request, Response } from "express";
import ShiftAssignment from "../../models/hrms/ShiftAssignment";
import { CommonEmailType } from "../../utils/email";
import { notifyHrmsUserInBackground, formatHrmsDate } from "../../utils/hrmsNotify";

// Shift assigned/changed → employee is notified in-app + email + WhatsApp
// (Module Scope doc, Section 2 "Shift Roster" + Section 6.1 automatic
// notifications). Fire-and-forget: never fails the assignment.
function notifyShift(user: any, shift: string, date: any, updated = false) {
  notifyHrmsUserInBackground({
    user,
    event: "hrms_shift_assigned",
    title: updated ? "Shift updated" : "New shift assigned",
    message: `Your shift on ${formatHrmsDate(date)} is ${shift}.`,
    link: "/hrms/employee/attendance/shift-schedule",
    email: { template: CommonEmailType.SHIFT_ASSIGNED, data: { shift, date, updated } },
    whatsapp: {
      params: { shift, date: formatHrmsDate(date) },
      fallbackText: `Your shift on ${formatHrmsDate(date)} has been ${updated ? "updated to" : "set to"} ${shift}.`,
    },
  });
}
import User from "../../models/User";
/* ===============================
   GET SHIFTS BY WEEK
   =============================== */

export const getShiftsByWeek = async (req: Request, res: Response) => {
  try {
    const { start, page = "1", limit = "15" } = req.query;

    if (!start) {
      return res.status(400).json({ message: "Week start date required" });
    }

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);

    const startDate = new Date(start as string);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const filter = {
      date: {
        $gte: startDate.toISOString().split("T")[0],
        $lte: endDate.toISOString().split("T")[0],
      },
    };

    const totalShifts = await ShiftAssignment.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(totalShifts / limitNum), 1);

    // ⛔ page out of range → last valid page
    const safePage = pageNum > totalPages ? totalPages : pageNum;
    const skip = (safePage - 1) * limitNum;

    const shifts = await ShiftAssignment.find(filter)
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch shifts" });
  }
};




/* ===============================
   ASSIGN SHIFT (SINGLE)
   =============================== */
export const assignShift = async (req: Request, res: Response) => {
  try {
    const { userId, date, shift } = req.body;

    const record = await ShiftAssignment.findOneAndUpdate(
      { userId, date },
      { shift },
      { new: true, upsert: true },
    );

    // 🔹 Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    notifyShift(user, shift, date);

    res.json({
      message: "Shift assigned successfully",
      data: record,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to assign shift" });
  }
};

/* ===============================
   BULK ASSIGN SHIFTS
   =============================== */
export const bulkAssignShift = async (req: Request, res: Response) => {
  try {
    const { userIds, date, shift } = req.body;

    if (!userIds?.length) {
      return res.status(400).json({ message: "User list required" });
    }

    const operations = userIds.map((userId: string) => ({
      updateOne: {
        filter: { userId, date },
        update: { userId, date, shift },
        upsert: true,
      },
    }));

    await ShiftAssignment.bulkWrite(operations);

    const users = await User.find({ _id: { $in: userIds } });
    for (const user of users) notifyShift(user, shift, date);

    res.json({ message: "Shifts assigned successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Bulk shift assign failed" });
  }
};

/* ===============================
   UPDATE SHIFT
   =============================== */
export const updateShift = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { shift } = req.body;

    const updated = await ShiftAssignment.findByIdAndUpdate(
      id,
      { shift },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ message: "Shift assignment not found" });
    }

    // 🔹 Get user
    const user = await User.findById(updated.userId);
    if (user) notifyShift(user, shift, updated.date, true);

    res.json({
      message: "Shift updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update shift" });
  }
};

/* ===============================
   DELETE SHIFT
   =============================== */
export const deleteShift = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await ShiftAssignment.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Shift assignment not found" });
    }

    res.json({
      message: "Shift deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete shift" });
  }
};
