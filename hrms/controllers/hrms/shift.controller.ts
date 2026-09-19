/** @format */

import { Request, Response } from "express";
import ShiftAssignment from "../../models/hrms/ShiftAssignment";
import { sendCommonEmail, CommonEmailType, sendEmail } from "../../utils/email";
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

    // 📧 EMAIL — SHIFT ASSIGNED (best-effort — must not fail the request if it errors)
    if (user.email) {
      try {
        await sendCommonEmail({
          to: user.email,
          name: user.name,
          type: CommonEmailType.SHIFT_ASSIGNED,
          data: {
            shift: shift,
            date: date,
          },
        });
      } catch (emailError) {
        console.error(`Failed to send shift email to ${user.email}:`, emailError);
      }
    }

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

    // 📧 EMAIL ALL USERS (best-effort — must not fail the request if it errors)
    const users = await User.find({ _id: { $in: userIds } });

    for (const user of users) {
      if (user.email) {
        try {
          await sendCommonEmail({
            to: user.email,
            name: user.name,
            type: CommonEmailType.SHIFT_ASSIGNED,
            data: {
              shift: shift,
              date: date,
            },
          });
        } catch (emailError) {
          console.error(`Failed to send shift email to ${user.email}:`, emailError);
        }
      }
    }

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
    if (user?.email) {
      // 📧 SHIFT UPDATED MAIL (best-effort — must not fail the request if it errors)
      try {
        await sendCommonEmail({
          type: CommonEmailType.SHIFT_ASSIGNED, // reuse same template
          to: user.email,
          name: user.name,
          data: {
            shift: shift,
            date: updated.date,
            updated: true, // optional flag
          },
        });
      } catch (emailError) {
        console.error(`Failed to send shift update email to ${user.email}:`, emailError);
      }
    }

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
