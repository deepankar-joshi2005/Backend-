/** @format */

import { Response } from "express";
import path from "path";
import fs from "fs";
import { AuthRequest } from "../../middleware/auth";
import User from "../../models/User";
import UserDocument from "../../models/UserDocument";
import { ROLES } from "../../constants";

const isAdminRole = (req: AuthRequest) =>
  req.user.isSystemAdmin ||
  req.user.role === ROLES.HRMSAdmin ||
  req.user.role === ROLES.SuperAdmin ||
  req.user.role === ROLES.Admin;

// multer's .any() populates req.files (array), not req.file (singular) —
// resolve whichever the request actually has.
const resolveUploadedFile = (req: AuthRequest): any =>
  (req as any).file || ((req as any).files && (req as any).files[0]);

/**
 * 📤 Upload a new document for an employee (self-service or admin on behalf of)
 */
export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const file = resolveUploadedFile(req);
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const documentType = req.body.documentType;
    if (!documentType) {
      return res.status(400).json({ message: "documentType is required" });
    }

    const isSelf = String(req.user._id) === String(userId);
    if (!isSelf && !isAdminRole(req)) {
      return res.status(403).json({ message: "Access denied." });
    }

    const targetUser = await User.findById(userId).select("companyId");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const doc = await UserDocument.create({
      user: userId,
      companyId: targetUser.companyId,
      documentType,
      documentName: file.originalname,
      fileUrl: `uploads/user-documents/${file.filename}`,
      status: "PENDING",
    });

    return res.status(201).json({ message: "Document uploaded successfully", document: doc });
  } catch (error: any) {
    console.error("Upload document error:", error);
    return res.status(500).json({ message: "Failed to upload document", error: error.message });
  }
};

/**
 * 🔄 Re-upload (replace) an existing document — blocked once verified
 */
export const updateDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const file = resolveUploadedFile(req);
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const existingDoc = await UserDocument.findById(id);
    if (!existingDoc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const isSelf = String(req.user._id) === String(existingDoc.user);
    if (!isSelf && !isAdminRole(req)) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (existingDoc.status === "VERIFIED") {
      return res.status(403).json({
        message: "This document is already verified and cannot be re-uploaded",
      });
    }

    // Remove the old file from disk before pointing at the new one
    const oldFilePath = path.join(process.cwd(), existingDoc.fileUrl);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }

    existingDoc.fileUrl = `uploads/user-documents/${file.filename}`;
    existingDoc.documentName = file.originalname;
    existingDoc.status = "PENDING"; // reset review status on re-upload
    existingDoc.verifiedBy = undefined;
    existingDoc.verifiedAt = undefined;
    existingDoc.rejectionReason = undefined;
    await existingDoc.save();

    return res.status(200).json({ message: "Document updated successfully", document: existingDoc });
  } catch (error: any) {
    console.error("Update document error:", error);
    return res.status(500).json({ message: "Failed to update document", error: error.message });
  }
};

/**
 * 📄 Get all documents belonging to a specific user (self, their manager, or admin)
 */
export const getDocumentsByUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const isSelf = String(req.user._id) === String(userId);
    if (!isSelf && !isAdminRole(req)) {
      const targetUser = await User.findById(userId).select("managerId");
      const isManager =
        targetUser && String(targetUser.managerId || "") === String(req.user._id);
      if (!isManager) {
        return res.status(403).json({ message: "Access denied." });
      }
    }

    const docs = await UserDocument.find({ user: userId }).sort({ createdAt: -1 });
    return res.status(200).json(docs);
  } catch (error: any) {
    console.error("Get documents by user error:", error);
    return res.status(500).json({ message: "Failed to fetch documents", error: error.message });
  }
};

/**
 * 📋 Get all documents across the company (Document Verification list)
 */
export const getAllDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {};
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    }

    const docs = await UserDocument.find(filter)
      .populate("user", "name employeeId email role")
      .sort({ createdAt: -1 });

    return res.status(200).json(docs);
  } catch (error: any) {
    console.error("Get all documents error:", error);
    return res.status(500).json({ message: "Failed to fetch documents", error: error.message });
  }
};

/**
 * ✅ Verify or ❌ reject an employee's uploaded document
 */
export const setDocumentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Status must be VERIFIED or REJECTED" });
    }

    const doc = await UserDocument.findById(id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (
      !req.user.isSystemAdmin &&
      req.user.role !== ROLES.HRMSAdmin &&
      String(doc.companyId) !== String(req.user.companyId)
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    doc.status = status;
    doc.verifiedBy = req.user._id;
    doc.verifiedAt = new Date();
    doc.rejectionReason = status === "REJECTED" ? rejectionReason || "" : undefined;
    await doc.save();

    return res.status(200).json({
      message: `Document ${status === "VERIFIED" ? "verified" : "rejected"} successfully`,
      document: doc,
    });
  } catch (error: any) {
    console.error("Set document status error:", error);
    return res.status(500).json({ message: "Failed to update document status", error: error.message });
  }
};

/**
 * 📋 Get Onboarding Checklist for Users
 * Returns a list of users and their document statuses (Aadhaar, PAN, etc.)
 */
export const getOnboardingChecklist = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 15, search = "" } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    // 🔍 1. Build Filter (Multi-tenancy + Search)
    const filter: any = {};
    
    // Multi-tenancy isolation
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    }

    // Search by name, employeeId or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // 📄 2. Fetch Users with Pagination
    const totalRecords = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limitNumber);
    const skip = (pageNumber - 1) * limitNumber;

    const users = await User.find(filter)
      .select("name email employeeId role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    // 📂 3. Fetch Documents for each user in parallel
    const checklistData = await Promise.all(
      users.map(async (user) => {
        const docs = await UserDocument.find({ user: user._id }).select("documentType status");
        
        // Format documents as [ { type: "AADHAAR", status: "VERIFIED" }, ... ]
        const formattedDocs = docs.map((d) => ({
          type: d.documentType,
          status: d.status,
        }));

        return {
          userId: user._id,
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
          role: user.role,
          documents: formattedDocs,
        };
      })
    );

    // 🚀 4. Send Response
    return res.status(200).json({
      success: true,
      data: checklistData,
      totalRecords,
      totalPages,
      currentPage: pageNumber,
    });
  } catch (error: any) {
    console.error("Fetch Onboarding Checklist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch onboarding checklist",
      error: error.message,
    });
  }
};
