"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.uploadProfilePicture = exports.updateUserById = exports.resetPassword = exports.deleteUser = exports.getUserById = exports.getUsers = exports.createUser = exports.getNextEmployeeId = exports.getCompanyAbbr = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
const UserDocument_1 = __importDefault(require("../models/UserDocument"));
const Company_1 = __importDefault(require("../models/hrms/Company"));
const Branch_1 = __importDefault(require("../models/hrms/Branch"));
const Department_1 = __importDefault(require("../models/hrms/Department"));
const Designation_1 = __importDefault(require("../models/hrms/Designation"));
const CostCenter_1 = __importDefault(require("../models/hrms/CostCenter"));
const constants_1 = require("../constants");
const email_1 = require("../utils/email");
const email_2 = require("../utils/email");
/* ======================================================
   ✅ EMPLOYEE ID GENERATION (COMPANY-BASED)
   Format: EMP-{ABBR}-NNNN  e.g. EMP-TEC-0001
   ====================================================== */
/**
 * Returns a 3-letter uppercase abbreviation from a company name.
 * e.g. "Techize Builder" -> "TEC", "Google" -> "GOO"
 */
const getCompanyAbbr = (companyName) => {
    const letters = companyName.replace(/[^a-zA-Z]/g, "");
    return letters.substring(0, 3).toUpperCase();
};
exports.getCompanyAbbr = getCompanyAbbr;
const generateEmployeeId = async (companyId) => {
    let abbr = "EMP";
    if (companyId) {
        const company = await Company_1.default.findById(companyId).select("name");
        if (company === null || company === void 0 ? void 0 : company.name) {
            abbr = (0, exports.getCompanyAbbr)(company.name);
        }
    }
    const prefix = `EMP-${abbr}-`;
    const lastUser = await User_1.default.findOne({
        employeeId: { $regex: `^${prefix}` },
    })
        .sort({ createdAt: -1 })
        .select("employeeId");
    let nextNumber = 1;
    if (lastUser === null || lastUser === void 0 ? void 0 : lastUser.employeeId) {
        const parts = lastUser.employeeId.split("-");
        const lastNumStr = parts[parts.length - 1];
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum))
            nextNumber = lastNum + 1;
    }
    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};
/**
 * Preview the next Employee ID for a company — used by frontend
 */
const getNextEmployeeId = async (req, res) => {
    try {
        const { companyId } = req.query;
        const nextId = await generateEmployeeId(companyId);
        return res.json({ employeeId: nextId });
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to generate employee ID" });
    }
};
exports.getNextEmployeeId = getNextEmployeeId;
/* ================= CREATE USER ================= */
const createUser = async (req, res) => {
    try {
        const { 
        /* BASIC */
        name, email, mobile, address, gender, dob, joiningDate, 
        /* AUTH */
        password, role, 
        /* JOB */
        companyId, branchId, departmentId, designationId, managerId, employmentType, costCenterId, } = req.body;
        // Handle profile picture if uploaded
        const profilePicture = req.file
            ? `/uploads/profile-pictures/${req.file.filename}`
            : null;
        /* ================= VALIDATION ================= */
        if (!name ||
            !email ||
            !mobile ||
            !gender ||
            !dob ||
            !joiningDate ||
            !role ||
            !companyId ||
            !branchId ||
            !departmentId ||
            !designationId) {
            return res.status(400).json({
                message: "All required fields must be provided",
            });
        }
        if (password && password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long",
            });
        }
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                message: "User with this email already exists",
            });
        }
        /* ================= EMPLOYEE ID ================= */
        const targetCompanyId = req.user.role === constants_1.ROLES.HRMSAdmin ? companyId : req.user.companyId;
        const employeeId = await generateEmployeeId(targetCompanyId);
        /* ================= PROBATION LOGIC ================= */
        const PROBATION_PERIOD_MONTHS = 6;
        const joining = new Date(joiningDate);
        const probationEndDate = new Date(joining);
        probationEndDate.setMonth(probationEndDate.getMonth() + PROBATION_PERIOD_MONTHS);
        /* ================= CREATE USER ================= */
        const user = await User_1.default.create({
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
                await (0, email_2.sendUserCredentialsEmail)({
                    to: email,
                    name,
                    password,
                    role,
                    employeeId,
                });
            }
        }
        catch (err) {
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
    }
    catch (error) {
        console.error("Create user error:", error);
        return res.status(500).json({
            message: "Failed to create user",
            error: error.message,
        });
    }
};
exports.createUser = createUser;
// Get all users
const getUsers = async (req, res) => {
    try {
        const { page, limit = 15, search, companyId, designation, company, branch, department, costCenter, manager, joiningDate, probationEndDate, confirmationDate, terminationDate, employmentType, contact, gender, employmentStatus, role } = req.query;
        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        // 🔍 search filter
        const filter = {};
        // Multi-tenancy filtering
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        else if (companyId) {
            filter.companyId = companyId;
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { employeeId: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }
        // Advanced Filters
        if (designation) {
            const designations = await Designation_1.default.find({ name: { $regex: designation, $options: "i" } });
            filter.designationId = { $in: designations.map(d => d._id) };
        }
        if (department) {
            const departments = await Department_1.default.find({ name: { $regex: department, $options: "i" } });
            filter.departmentId = { $in: departments.map(d => d._id) };
        }
        if (branch) {
            const branches = await Branch_1.default.find({ name: { $regex: branch, $options: "i" } });
            filter.branchId = { $in: branches.map(b => b._id) };
        }
        if (company && !companyId) {
            const companies = await Company_1.default.find({ name: { $regex: company, $options: "i" } });
            filter.companyId = { $in: companies.map(c => c._id) };
        }
        if (costCenter) {
            const costCenters = await CostCenter_1.default.find({
                $or: [
                    { name: { $regex: costCenter, $options: "i" } },
                    { code: { $regex: costCenter, $options: "i" } }
                ]
            });
            filter.costCenterId = { $in: costCenters.map(cc => cc._id) };
        }
        if (manager) {
            const managers = await User_1.default.find({ name: { $regex: manager, $options: "i" } });
            filter.managerId = { $in: managers.map(m => m._id) };
        }
        if (employmentType) {
            filter.employmentType = { $regex: employmentType, $options: "i" };
        }
        if (gender) {
            filter.gender = { $regex: gender, $options: "i" };
        }
        if (employmentStatus) {
            filter.employmentStatus = { $regex: employmentStatus, $options: "i" };
        }
        if (role) {
            filter.role = { $regex: role, $options: "i" };
        }
        if (contact) {
            filter.$or = filter.$or || [];
            filter.$or.push({ email: { $regex: contact, $options: "i" } }, { mobile: { $regex: contact, $options: "i" } });
        }
        // Date Filters (Simple string search on date parts or exact match if applicable)
        const addDateFilter = (field, value) => {
            if (!value)
                return;
            // If value is like "01/2024", search records in that month
            if (/^\d{2}\/\d{4}$/.test(value)) {
                const [month, year] = value.split("/");
                const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
                filter[field] = { $gte: startDate, $lte: endDate };
            }
            else if (/^\d{4}$/.test(value)) {
                const year = parseInt(value);
                const startDate = new Date(year, 0, 1);
                const endDate = new Date(year, 11, 31, 23, 59, 59);
                filter[field] = { $gte: startDate, $lte: endDate };
            }
            else {
                // Try regex if it's not a standard date format or just fallback to simple match
                // Note: MongoDB dates aren't easily searchable by regex, so we'll just ignore non-standard formats for now
            }
        };
        addDateFilter("joiningDate", joiningDate);
        addDateFilter("probationEndDate", probationEndDate);
        addDateFilter("confirmationDate", confirmationDate);
        addDateFilter("terminationDate", terminationDate);
        let query = User_1.default.find(filter)
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
            const totalUsers = await User_1.default.countDocuments(filter);
            // Fetch document counts for each user
            const usersData = await Promise.all(usersRaw.map(async (u) => {
                const docs = await UserDocument_1.default.find({ user: u._id }).select("status");
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
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch users" });
    }
};
exports.getUsers = getUsers;
// Get single user by ID
const getUserById = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id)
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
        const targetUserCompanyId = ((_a = user.companyId) === null || _a === void 0 ? void 0 : _a._id) ? user.companyId._id.toString() : user.companyId.toString();
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && targetUserCompanyId !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied. You do not have permission to view users from another company." });
        }
        const documents = await UserDocument_1.default.find({ user: user._id });
        res.json({
            ...user.toObject(),
            documents, // Including docs directly for single user fetch
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch user" });
    }
};
exports.getUserById = getUserById;
const deleteUser = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        // ❗ Safety: System SuperAdmin delete nahi hoga
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Access check: SystemAdmin and HRMSAdmin can delete ANY company's user.
        const targetUserCompanyId = ((_a = user.companyId) === null || _a === void 0 ? void 0 : _a._id) ? user.companyId._id.toString() : user.companyId.toString();
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && targetUserCompanyId !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }
        // Billing Logic: Add consumed days to company.unbilledUsageDays
        if (user.status === "ACTIVE" && user.activeSince) {
            const company = await Company_1.default.findById(user.companyId);
            if (company) {
                const now = new Date();
                const diffInMs = now.getTime() - new Date(user.activeSince).getTime();
                const diffInDays = Math.max(diffInMs / (1000 * 60 * 60 * 24), 0);
                company.unbilledUsageDays = (company.unbilledUsageDays || 0) + diffInDays;
                await company.save();
            }
        }
        await User_1.default.findByIdAndDelete(id);
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete user" });
    }
};
exports.deleteUser = deleteUser;
/* ======================================================
   🔐 RESET PASSWORD (TUMHARA CODE – UNCHANGED)
   ====================================================== */
const resetPassword = async (req, res) => {
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
        const targetUser = await User_1.default.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }
        const canResetPassword = checkResetPasswordPermission(currentUser.role, targetUser.role, currentUser._id.toString(), targetUser._id.toString(), currentUser.isSystemAdmin || false, targetUser.isSystemAdmin || false);
        if (!canResetPassword) {
            return res.status(403).json({
                message: "You do not have permission to reset this user's password",
            });
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await User_1.default.updateOne({ _id: targetUser._id }, { $set: { password: hashedPassword } }, { runValidators: false });
        if (targetUser.role === constants_1.ROLES.SuperAdmin &&
            currentUser._id.toString() !== targetUser._id.toString()) {
            try {
                await (0, email_1.sendPasswordResetEmail)({
                    to: targetUser.email,
                    name: targetUser.name || "SuperAdmin",
                    newPassword,
                });
            }
            catch (err) {
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
    }
    catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({
            message: "Failed to reset password",
            error: error.message,
        });
    }
};
exports.resetPassword = resetPassword;
/* ======================================================
   🔒 PERMISSION HELPER (UNCHANGED)
   ====================================================== */
function checkResetPasswordPermission(currentUserRole, targetUserRole, currentUserId, targetUserId, currentUserIsSystemAdmin, targetUserIsSystemAdmin) {
    if (currentUserId === targetUserId)
        return true;
    if (targetUserIsSystemAdmin)
        return currentUserIsSystemAdmin;
    // 🔥 Global Admins can reset anyone except SystemAdmins (handled above)
    if (currentUserRole === constants_1.ROLES.HRMSAdmin)
        return true;
    if (currentUserRole === constants_1.ROLES.SuperAdmin)
        return true;
    if (currentUserRole === constants_1.ROLES.LeadMentor)
        return targetUserRole !== constants_1.ROLES.SuperAdmin;
    if (currentUserRole === constants_1.ROLES.SchoolAdmin)
        return (targetUserRole !== constants_1.ROLES.SuperAdmin && targetUserRole !== constants_1.ROLES.LeadMentor);
    if (currentUserRole === constants_1.ROLES.Mentor)
        return targetUserRole === constants_1.ROLES.Student;
    return false;
}
const updateUserById = async (req, res) => {
    var _a;
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
        if (req.file) {
            updateData.profilePicture = `/uploads/profile-pictures/${req.file.filename}`;
        }
        const userToUpdate = await User_1.default.findById(id);
        if (!userToUpdate) {
            return res.status(404).json({ message: "User not found" });
        }
        // Access check: SystemAdmin and HRMSAdmin can update ANY company's user.
        const targetUserCompanyId = ((_a = userToUpdate.companyId) === null || _a === void 0 ? void 0 : _a._id) ? userToUpdate.companyId._id.toString() : userToUpdate.companyId.toString();
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin && targetUserCompanyId !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }
        // Billing Logic: Handle Status Transition (ACTIVE <-> INACTIVE)
        if (updateData.status && updateData.status !== userToUpdate.status) {
            const now = new Date();
            const company = await Company_1.default.findById(userToUpdate.companyId);
            if (updateData.status === "ACTIVE") {
                // Just activated: Start the meter
                updateData.activeSince = now;
            }
            else if (userToUpdate.status === "ACTIVE" && userToUpdate.activeSince) {
                // Deactivated: Record consumed days and stop meter
                if (company) {
                    const diffInMs = now.getTime() - new Date(userToUpdate.activeSince).getTime();
                    const diffInDays = Math.max(diffInMs / (1000 * 60 * 60 * 24), 0);
                    company.unbilledUsageDays = (company.unbilledUsageDays || 0) + diffInDays;
                    await company.save();
                }
                updateData.activeSince = null; // Stop tracking
            }
        }
        const updatedUser = await User_1.default.findByIdAndUpdate(id, {
            $set: updateData, // 🔥 jo payload me aaya wahi update
        }, {
            new: true,
            runValidators: true,
        })
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
    }
    catch (error) {
        console.error("Update user error:", error);
        return res.status(500).json({
            message: "Failed to update user",
            error: error.message,
        });
    }
};
exports.updateUserById = updateUserById;
/* ================= UPLOAD PROFILE PICTURE ================= */
const uploadProfilePicture = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const profilePicture = `/uploads/profile-pictures/${req.file.filename}`;
        const updatedUser = await User_1.default.findByIdAndUpdate(id, { $set: { profilePicture } }, { new: true, runValidators: false }).select("name email profilePicture");
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json({ message: "Profile picture updated", user: updatedUser });
    }
    catch (error) {
        console.error("Upload profile picture error:", error);
        return res.status(500).json({ message: "Failed to upload profile picture", error: error.message });
    }
};
exports.uploadProfilePicture = uploadProfilePicture;
/* ================= CHANGE PASSWORD ================= */
const changePassword = async (req, res) => {
    try {
        const { id, currentPassword, newPassword } = req.body;
        if (!id || !currentPassword || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Verify current password
        const isMatch = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect current password" });
        }
        // Hash and update new password
        const salt = await bcrypt_1.default.genSalt(10);
        user.password = await bcrypt_1.default.hash(newPassword, salt);
        await user.save();
        res.json({ message: "Password updated successfully" });
    }
    catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Failed to change password", error: error.message });
    }
};
exports.changePassword = changePassword;
