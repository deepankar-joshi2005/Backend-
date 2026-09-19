import { Response } from "express";
import Clearance from "../../models/hrms/Clearance";
import User from "../../models/User";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";

/* 🔹 Create Clearance when Resignation Approved */
export const createClearanceFromResignation = async (resignation: any) => {
  await Clearance.create({
    resignation: resignation._id,
    employee: resignation.employee,
    lastWorkingDay: resignation.expectedLastWorkingDay,
    companyId: resignation.companyId, // Inherit companyId from resignation
    clearances: [
      { department: "IT", status: "PENDING", tasks: [] },
      { department: "Finance", status: "PENDING", tasks: [] },
      { department: "HR", status: "PENDING", tasks: [] },
      { department: "Admin", status: "PENDING", tasks: [] },
    ],
  });
};


/* 🔹 Get All Clearance */
export const getAllClearances = async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "15", search = "" } = req.query;
    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    let filter: any = {};
    if (req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    }

    if (search) {
      const users = await User.find({
        name: { $regex: search, $options: "i" },
        ...(req.user.role !== ROLES.HRMSAdmin ? { companyId: req.user.companyId } : {})
      }).select("_id");
      const userIds = users.map((u: any) => u._id);
      filter.employee = { $in: userIds };
    }

    const [data, totalRecords] = await Promise.all([
      Clearance.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: "employee",
          select: "name role departmentId",
          populate: {
            path: "departmentId",
            select: "name",
          },
        }),
      Clearance.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* 🔹 Update Department Clearance Status */
export const updateDepartmentClearance = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { clearanceId } = req.params;
    const { departmentName, status, remarks, tasks } = req.body;

    const clearance = await Clearance.findById(clearanceId);
    if (!clearance) {
      return res.status(404).json({ message: "Clearance not found" });
    }

    // Access check
    if (req.user.role !== ROLES.HRMSAdmin && clearance.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    const dept = clearance.clearances.find(
      (c) => c.department === departmentName
    );

    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    dept.status = status;
    if (remarks) dept.remarks = remarks;
    if (tasks) dept.tasks = tasks;

    clearance.overallStatus = clearance.clearances.every(
      (c) => c.status === "CLEARED"
    )
      ? "COMPLETED"
      : "IN_PROGRESS";

    await clearance.save();

    res.json({ message: "Updated", data: clearance });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};


