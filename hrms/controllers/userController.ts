/** @format */

import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";
import UserDocument from "../models/UserDocument";
import Company from "../models/hrms/Company";
import Branch from "../models/hrms/Branch";
import Department from "../models/hrms/Department";
import Designation from "../models/hrms/Designation";
import CostCenter from "../models/hrms/CostCenter";
import { ROLES } from "../constants";
import { AuthRequest } from "../middleware/auth";
import { sendPasswordResetEmail } from "../utils/email";
import { sendUserCredentialsEmail } from "../utils/email";
import path from "path";
import fs from "fs";
import { getEmployeeLimitStatus, employeeLimitErrorMessage } from "../utils/enforceEmployeeLimit";

/* ======================================================
   ✅ EMPLOYEE ID GENERATION (COMPANY-BASED)
   Format: EMP-{ABBR}-NNNN  e.g. EMP-TEC-0001
   ====================================================== */

/**
 * Returns a 3-letter uppercase abbreviation from a company name.
 * e.g. "Techize Builder" -> "TEC", "Google" -> "GOO"
 */
export const getCompanyAbbr = (companyName: string): string => {
  const letters = companyName.replace(/[^a-zA-Z]/g, "");
  return letters.substring(0, 3).toUpperCase();
};

const generateEmployeeId = async (companyId?: string): Promise<string> => {
  let abbr = "EMP";

  if (companyId) {
    const company = await Company.findById(companyId).select("name");
    if (company?.name) {
      abbr = getCompanyAbbr(company.name);
    }
  }

  const prefix = `EMP-${abbr}-`;

  const lastUser = await User.findOne({
    employeeId: { $regex: `^${prefix}` },
  })
    .sort({ createdAt: -1 })
    .select("employeeId");

  let nextNumber = 1;

  if (lastUser?.employeeId) {
    const parts = lastUser.employeeId.split("-");
    const lastNumStr = parts[parts.length - 1];
    const lastNum = parseInt(lastNumStr, 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

/**
 * Preview the next Employee ID for a company — used by frontend
 */
export const getNextEmployeeId = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.query;
    const nextId = await generateEmployeeId(companyId as string | undefined);
    return res.json({ employeeId: nextId });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to generate employee ID" });
  }
};

/* ================= CREATE USER ================= */
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const {
      /* BASIC */
      name,
      email,
      mobile,
      address,
      gender,
      dob,
      joiningDate,

      /* AUTH */
      password,
      role,

      /* JOB */
      companyId,
      branchId,
      departmentId,
      designationId,
      managerId,
      employmentType,
      costCenterId,
    } = req.body;

    // Handle profile picture if uploaded
    const profilePicture = req.file
      ? `/uploads/profile-pictures/${req.file.filename}`
      : null;

    /* ================= VALIDATION ================= */
    if (
      !name ||
      !email ||
      !mobile ||
      !gender ||
      !dob ||
      !joiningDate ||
      !role ||
      !companyId ||
      !branchId ||
      !departmentId ||
      !designationId
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    if (password && password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    const targetCompanyId = req.user.role === ROLES.HRMSAdmin ? companyId : req.user.companyId;

    /* ================= PLAN EMPLOYEE LIMIT ================= */
    const limitStatus = await getEmployeeLimitStatus(targetCompanyId);
    if (limitStatus.limited && limitStatus.current >= limitStatus.limit) {
      return res.status(403).json({
        message: employeeLimitErrorMessage(limitStatus.planTier, limitStatus.limit),
        isEmployeeLimitReached: true,
        employeeLimit: limitStatus.limit,
        activeCount: limitStatus.current,
      });
    }

    /* ================= EMPLOYEE ID ================= */
    const employeeId = await generateEmployeeId(targetCompanyId);

    /* ================= PROBATION LOGIC ================= */
    const PROBATION_PERIOD_MONTHS = 6;

    const joining = new Date(joiningDate);
    const probationEndDate = new Date(joining);
    probationEndDate.setMonth(
      probationEndDate.getMonth() + PROBATION_PERIOD_MONTHS
    );

    /* ================= CREATE USER ================= */
    const user = await User.create({
      employeeId,

      name,
      email,
      mobile,
      address: address || null,
      gender,
      dob,
      joiningDate,

      password,
      role,

      companyId: targetCompanyId,
      branchId,
      departmentId,
      designationId,
      managerId: managerId || null,
      costCenterId: costCenterId || null,
      employmentType: employmentType || "Full-Time",

      /* ===== PROFILE PICTURE ===== */
      profilePicture: profilePicture || null,

      /* ===== PROBATION AUTO SET ===== */
      probationPeriod: PROBATION_PERIOD_MONTHS,
      probationEndDate,
      employmentStatus: "PROBATION",

      /* ===== BILLING ===== */
      activeSince: new Date(), // Start tracking usage from creation
    });

    /* ================= SEND EMAIL ================= */
    try {
      if (password) {
        await sendUserCredentialsEmail({
          to: email,
          name,
          password,
          role,
          employeeId,
        });
      }
    } catch (err) {
      console.error("Failed to send credentials email:", err);
    }

    /* ================= RESPONSE ================= */
    return res.status(201).json({
      message: "Employee created successfully",
      user: {
        id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
        employmentStatus: user.employmentStatus,
        probationEndDate: user.probationEndDate,
      },
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return res.status(500).json({
      message: "Failed to create user",
      error: error.message,
    });
  }
};




// Get all users
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page,
      limit = 15,
      search,
      companyId,
      designation,
      company,
      branch,
      department,
      costCenter,
      manager,
      joiningDate,
      probationEndDate,
      confirmationDate,
      terminationDate,
      employmentType,
      contact,
      gender,
      employmentStatus,
      role,
      excludeRoles
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    // 🔍 search filter
    const filter: any = {};

    // Multi-tenancy filtering
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    } else if (companyId) {
      filter.companyId = companyId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { employeeId: { $regex: search as string, $options: "i" } },
        { email: { $regex: search as string, $options: "i" } },
      ];
    }

    // Advanced Filters
    if (designation) {
      const designations = await Designation.find({ name: { $regex: designation as string, $options: "i" } });
      filter.designationId = { $in: designations.map(d => d._id) };
    }

    if (department) {
      const departments = await Department.find({ name: { $regex: department as string, $options: "i" } });
      filter.departmentId = { $in: departments.map(d => d._id) };
    }

    if (branch) {
      const branches = await Branch.find({ name: { $regex: branch as string, $options: "i" } });
      filter.branchId = { $in: branches.map(b => b._id) };
    }

    if (company && !companyId) {
      const companies = await Company.find({ name: { $regex: company as string, $options: "i" } });
      filter.companyId = { $in: companies.map(c => c._id) };
    }

    if (costCenter) {
      const costCenters = await CostCenter.find({
        $or: [
          { name: { $regex: costCenter as string, $options: "i" } },
          { code: { $regex: costCenter as string, $options: "i" } }
        ]
      });
      filter.costCenterId = { $in: costCenters.map(cc => cc._id) };
    }

    if (manager) {
      const managers = await User.find({ name: { $regex: manager as string, $options: "i" } });
      filter.managerId = { $in: managers.map(m => m._id) };
    }

    if (employmentType) {
      filter.employmentType = { $regex: employmentType as string, $options: "i" };
    }

    if (gender) {
      filter.gender = { $regex: gender as string, $options: "i" };
    }

    if (employmentStatus) {
      filter.employmentStatus = { $regex: employmentStatus as string, $options: "i" };
    }

    if (role) {
      filter.role = { $regex: role as string, $options: "i" };
    } else if (excludeRoles) {
      const excluded = (excludeRoles as string)
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);
      if (excluded.length) filter.role = { $nin: excluded };
    }

    if (contact) {
      filter.$or = filter.$or || [];
      filter.$or.push(
        { email: { $regex: contact as string, $options: "i" } },
        { mobile: { $regex: contact as string, $options: "i" } }
      );
    }

    // Date Filters (Simple string search on date parts or exact match if applicable)
    const addDateFilter = (field: string, value: any) => {
      if (!value) return;
      // If value is like "01/2024", search records in that month
      if (/^\d{2}\/\d{4}$/.test(value)) {
        const [month, year] = value.split("/");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        filter[field] = { $gte: startDate, $lte: endDate };
      } else if (/^\d{4}$/.test(value)) {
        const year = parseInt(value);
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        filter[field] = { $gte: startDate, $lte: endDate };
      } else {
        // Try regex if it's not a standard date format or just fallback to simple match
        // Note: MongoDB dates aren't easily searchable by regex, so we'll just ignore non-standard formats for now
      }
    };

    addDateFilter("joiningDate", joiningDate);
    addDateFilter("probationEndDate", probationEndDate);
    addDateFilter("confirmationDate", confirmationDate);
    addDateFilter("terminationDate", terminationDate);

    let query = User.find(filter)
      .select("-password -passwordResetToken -passwordResetTokenExpiry")
      .populate("companyId", "name")
      .populate("branchId", "name")
      .populate("departmentId", "name")
      .populate("designationId", "name")
      .populate("managerId", "name")
      .populate("costCenterId", "name code");

    // ✅ Pagination ONLY when page is sent (same as before)
    if (!isNaN(pageNumber) && pageNumber > 0) {
      const skip = (pageNumber - 1) * limitNumber;
      query = query.skip(skip).limit(limitNumber);

      const usersRaw = await query;
      const totalUsers = await User.countDocuments(filter);

      // Fetch document counts for each user
      const usersData = await Promise.all(usersRaw.map(async (u: any) => {
        const docs = await UserDocument.find({ user: u._id }).select("status");
        return {
          ...u.toObject(),
          documentCounts: {
            uploaded: docs.length,
            verified: docs.filter(d => d.status === "VERIFIED").length
          }
        };
      }));

      return res.json({
        data: usersData,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limitNumber),
        currentPage: pageNumber,
      });
    }

    // ✅ Old behavior untouched (no pagination, no forced search)
    const users = await query;
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};




// Get single user by ID
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password -passwordResetToken -passwordResetTokenExpiry")
      .populate("companyId", "name")
      .populate("branchId", "name")
      .populate("departmentId", "name")
      .populate("designationId", "name")
      .populate("managerId", "name")
      .populate("costCenterId", "name code");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Access check: SystemAdmin and HRMSAdmin can view ANY company's user.
    const targetUserCompanyId = user.companyId?._id ? user.companyId._id.toString() : user.companyId.toString();
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && targetUserCompanyId !== req.user.companyId.toString()) {
      return res.status(403).json({ message: "Access denied. You do not have permission to view users from another company." });
    }

    const documents = await UserDocument.find({ user: user._id });

    res.json({
      ...user.toObject(),
      documents, // Including docs directly for single user fetch
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // ❗ Safety: System SuperAdmin delete nahi hoga
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Access check: SystemAdmin and HRMSAdmin can delete ANY company's user.
    const targetUserCompanyId = user.companyId?._id ? user.companyId._id.toString() : user.companyId.toString();
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && targetUserCompanyId !== req.user.companyId.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    // Billing Logic: Add consumed days to company.unbilledUsageDays
    if (user.status === "ACTIVE" && user.activeSince) {
      const company = await Company.findById(user.companyId);
      if (company) {
        const now = new Date();
        const diffInMs = now.getTime() - new Date(user.activeSince as any).getTime();
        const diffInDays = Math.max(diffInMs / (1000 * 60 * 60 * 24), 0);
        
        company.unbilledUsageDays = (company.unbilledUsageDays || 0) + diffInDays;
        await company.save();
      }
    }

    await User.findByIdAndDelete(id);

    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete user" });
  }
};


/* ======================================================
   🔐 RESET PASSWORD (TUMHARA CODE – UNCHANGED)
   ====================================================== */
export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, newPassword } = req.body;
    const currentUser = req.user;

    if (!userId || !newPassword) {
      return res
        .status(400)
        .json({ message: "User ID and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const canResetPassword = checkResetPasswordPermission(
      currentUser.role,
      targetUser.role,
      currentUser._id.toString(),
      targetUser._id.toString(),
      currentUser.isSystemAdmin || false,
      targetUser.isSystemAdmin || false
    );

    if (!canResetPassword) {
      return res.status(403).json({
        message: "You do not have permission to reset this user's password",
      });
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { _id: targetUser._id },
      { $set: { password: hashedPassword } },
      { runValidators: false }
    );


    if (
      targetUser.role === ROLES.SuperAdmin &&
      currentUser._id.toString() !== targetUser._id.toString()
    ) {
      try {
        await sendPasswordResetEmail({
          to: targetUser.email,
          name: targetUser.name || "SuperAdmin",
          newPassword,
        });
      } catch (err) {
        console.error("Email error:", err);
      }
    }

    res.json({
      message: "Password reset successfully",
      user: {
        id: targetUser._id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
      },
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

/* ======================================================
   🔒 PERMISSION HELPER (UNCHANGED)
   ====================================================== */
function checkResetPasswordPermission(
  currentUserRole: string,
  targetUserRole: string,
  currentUserId: string,
  targetUserId: string,
  currentUserIsSystemAdmin: boolean,
  targetUserIsSystemAdmin: boolean
): boolean {
  if (currentUserId === targetUserId) return true;
  if (targetUserIsSystemAdmin) return currentUserIsSystemAdmin;
  
  // 🔥 Global Admins can reset anyone except SystemAdmins (handled above)
  if (currentUserRole === ROLES.HRMSAdmin) return true;
  if (currentUserRole === ROLES.SuperAdmin) return true;
  
  if (currentUserRole === ROLES.LeadMentor)
    return targetUserRole !== ROLES.SuperAdmin;
  if (currentUserRole === ROLES.SchoolAdmin)
    return (
      targetUserRole !== ROLES.SuperAdmin && targetUserRole !== ROLES.LeadMentor
    );
  if (currentUserRole === ROLES.Mentor || currentUserRole === ROLES.Employee)
    return targetUserRole === ROLES.Student;
  return false;
}
export const updateUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // ❗ Safety: empty payload nahi chalega
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No data provided to update" });
    }

    // Handle profile picture update via multipart if file provided
    if ((req as any).file) {
      updateData.profilePicture = `/uploads/profile-pictures/${(req as any).file.filename}`;
    }

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({ message: "User not found" });
    }

    // Access check: SystemAdmin and HRMSAdmin can update ANY company's user.
    const targetUserCompanyId = userToUpdate.companyId?._id ? userToUpdate.companyId._id.toString() : userToUpdate.companyId.toString();
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin && targetUserCompanyId !== req.user.companyId.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    // Billing Logic: Handle Status Transition (ACTIVE <-> INACTIVE)
    if (updateData.status && updateData.status !== userToUpdate.status) {
      const now = new Date();
      const company = await Company.findById(userToUpdate.companyId);
      
      if (updateData.status === "ACTIVE") {
        // Just activated: Start the meter
        updateData.activeSince = now;
      } else if (userToUpdate.status === "ACTIVE" && userToUpdate.activeSince) {
        // Deactivated: Record consumed days and stop meter
        if (company) {
          const diffInMs = now.getTime() - new Date(userToUpdate.activeSince as any).getTime();
          const diffInDays = Math.max(diffInMs / (1000 * 60 * 60 * 24), 0);
          company.unbilledUsageDays = (company.unbilledUsageDays || 0) + diffInDays;
          await company.save();
        }
        updateData.activeSince = null; // Stop tracking
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: updateData, // 🔥 jo payload me aaya wahi update
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("-password -passwordResetToken -passwordResetTokenExpiry")
      .populate("companyId", "name")
      .populate("branchId", "name")
      .populate("departmentId", "name")
      .populate("designationId", "name")
      .populate("managerId", "name")
      .populate("costCenterId", "name code");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Update user error:", error);
    return res.status(500).json({
      message: "Failed to update user",
      error: error.message,
    });
  }
};

/* ================= UPLOAD PROFILE PICTURE ================= */
export const uploadProfilePicture = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const profilePicture = `/uploads/profile-pictures/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { profilePicture } },
      { new: true, runValidators: false }
    ).select("name email profilePicture");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "Profile picture updated", user: updatedUser });
  } catch (error: any) {
    console.error("Upload profile picture error:", error);
    return res.status(500).json({ message: "Failed to upload profile picture", error: error.message });
  }
};

/* ================= CHANGE PASSWORD ================= */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id, currentPassword, newPassword } = req.body;

    if (!id || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password" });
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password", error: error.message });
  }
};
