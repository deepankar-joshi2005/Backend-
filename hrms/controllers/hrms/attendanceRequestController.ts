/** @format */

import { Request, Response } from "express";
import AttendanceRequest from "../../models/hrms/AttendanceRequest";
import Attendance from "../../models/hrms/Attendance";
import { AuthRequest } from "../../middleware/auth";
import User from "../../models/User";
import { CommonEmailType, sendCommonEmail } from "../../utils/email";
import { ROLES } from "../../constants";
/* ================= CREATE ================= */
export const createRequest = async (req: AuthRequest, res: Response) => {
  const request = await AttendanceRequest.create({
    user: req.user!.id,
    companyId: req.user!.companyId,
    ...req.body,
  });
  res.status(201).json(request);
};

/* ================= GET MY REQUESTS ================= */
export const getMyRequests = async (req: AuthRequest, res: Response) => {
  const data = await AttendanceRequest.find({ user: req.user!.id }).sort({
    createdAt: -1,
  });
  res.json(data);
};

/* ================= UPDATE ================= */
export const updateRequest = async (req: AuthRequest, res: Response) => {
  const updated = await AttendanceRequest.findOneAndUpdate(
    { _id: req.params.id, user: req.user!.id, status: "PENDING" },
    req.body,
    { new: true }
  );
  res.json(updated);
};

/* ================= DELETE ================= */
export const deleteRequest = async (req: AuthRequest, res: Response) => {
  await AttendanceRequest.findOneAndDelete({
    _id: req.params.id,
    user: req.user!.id,
    status: "PENDING",
  });
  res.json({ message: "Request deleted" });
};
export const getTeamAttendanceRequests = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const managerId = req.user!.id;
    const { page, limit = 15, search = "" } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    // 1️⃣ find employees jinka managerId = logged-in manager
    const teamFilter: any = { managerId };
    if (req.user!.role !== ROLES.HRMSAdmin) {
      teamFilter.companyId = req.user!.companyId;
    }
    const teamMembers = await User.find(teamFilter, "_id name email role");
    const teamIds = teamMembers.map((u) => u._id);

    // 🔍 search filter
    const searchFilter = search
      ? {
        user: { $in: teamIds },
        $or: [
          { type: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ],
      }
      : { user: { $in: teamIds } };

    let query = AttendanceRequest.find(searchFilter)
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    if (!isNaN(pageNum) && pageNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);

      const [requests, totalUsers] = await Promise.all([
        query,
        AttendanceRequest.countDocuments(searchFilter),
      ]);

      return res.json({
        data: requests,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limitNum),
        currentPage: pageNum,
      });
    }

    const requests = await query;
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch attendance requests",
    });
  }
};
export const updateAttendanceRequestStatus = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { status, adminRemark } = req.body;

    const attendance = await AttendanceRequest.findByIdAndUpdate(
      req.params.id,
      { status, adminRemark },
      { new: true },
    );

    if (!attendance) {
      return res.status(404).json({ message: "Attendance request not found" });
    }

    // ✅ Approving a regularization request must actually correct the
    // underlying Attendance record — previously this only flipped the
    // request's own status and emailed the user, so approved corrections
    // never showed up anywhere (attendance grid, payroll, etc).
    if (status === "APPROVED" && attendance.punchIn && attendance.punchOut) {
      const punchInDate = new Date(`${attendance.date}T${attendance.punchIn}:00`);
      const punchOutDate = new Date(`${attendance.date}T${attendance.punchOut}:00`);

      if (
        !isNaN(punchInDate.getTime()) &&
        !isNaN(punchOutDate.getTime()) &&
        punchOutDate > punchInDate
      ) {
        const existing = await Attendance.findOne({
          user: attendance.user,
          date: attendance.date,
        });
        const totalBreakSeconds = existing?.totalBreakSeconds || 0;
        const totalWorkSeconds = Math.max(
          0,
          (punchOutDate.getTime() - punchInDate.getTime()) / 1000 - totalBreakSeconds
        );

        await Attendance.findOneAndUpdate(
          { user: attendance.user, date: attendance.date },
          {
            $set: {
              punchIn: punchInDate,
              punchOut: punchOutDate,
              totalWorkSeconds,
              source: "REQUEST",
              sourceRequestId: attendance._id,
              approvedBy: req.user!.id,
              approvedAt: new Date(),
              companyId: attendance.companyId,
            },
            $setOnInsert: { breaks: [], totalBreakSeconds: 0 },
          },
          { upsert: true, new: true }
        );
      }
    }

    // 🔹 Get user details (SAME PATTERN AS RESIGNATION)
    const user = await User.findById(attendance.user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 📧 EMAIL — APPROVED / REJECTED
    await sendCommonEmail({
      type: CommonEmailType.ATTENDANCE_REQUEST,
      to: user.email,
      name: user.name,
      data: {
        status,
        adminRemark,
      },
    });

    res.json({
      message: "Attendance request status updated",
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update attendance request",
      error,
    });
  }
};
/* ================= GET ALL ATTENDANCE REQUESTS ================= */
export const getAllAttendanceRequests = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { page, limit = 15, search = "" } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    // 🔍 search filter
    const finalFilter: any = {};
    if (req.user!.role !== ROLES.HRMSAdmin) {
      finalFilter.companyId = req.user!.companyId;
    }

    if (search) {
      const users = await User.find({
        name: { $regex: search, $options: "i" },
        ...(req.user!.role !== ROLES.HRMSAdmin ? { companyId: req.user!.companyId } : {})
      }).select("_id");
      const userIds = users.map(u => u._id);
      finalFilter.$or = [
        { user: { $in: userIds } },
        { type: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    let query = AttendanceRequest.find(finalFilter)
      .populate("user", "name email role managerId")
      .sort({ createdAt: -1 });

    if (!isNaN(pageNum) && pageNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);

      const [requests, totalUsers] = await Promise.all([
        query,
        AttendanceRequest.countDocuments(finalFilter),
      ]);

      return res.json({
        data: requests,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limitNum),
        currentPage: pageNum,
      });
    }

    const requests = await query;
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch all attendance requests",
    });
  }
};
