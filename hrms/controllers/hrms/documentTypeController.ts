/** @format */

import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";
import DocumentType from "../../models/hrms/DocumentType";

const slugifyKey = (label: string) =>
  label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// The KYC document types every company used to get for free before this
// became configurable. New companies are seeded with these on signup so
// they don't start with an empty list; existing companies are backfilled
// once via the seed-document-types script (src/seeds/seedDefaultDocumentTypes.ts).
export const DEFAULT_DOCUMENT_TYPES = [
  { key: "AADHAAR", label: "Aadhaar Card", description: "Upload your Aadhaar Card (front & back)" },
  { key: "PAN", label: "PAN Card", description: "Upload your PAN Card" },
  { key: "MARKSHEET_10", label: "10th Marksheet", description: "Upload your 10th standard marksheet" },
  { key: "MARKSHEET_12", label: "12th Marksheet", description: "Upload your 12th standard / graduation marksheet" },
  { key: "DEGREE_CERTIFICATE", label: "Degree Certificate", description: "Upload your degree/diploma certificate" },
  { key: "PASSBOOK", label: "Bank Passbook", description: "Upload the first page of your bank passbook / cancelled cheque" },
];

/**
 * Seeds the default document types for a company — but only if that
 * company doesn't already have any (so it never overwrites/duplicates
 * types an admin has already configured or intentionally deleted).
 */
export const seedDefaultDocumentTypesForCompany = async (companyId: any) => {
  const existingCount = await DocumentType.countDocuments({ companyId });
  if (existingCount > 0) return;

  await DocumentType.insertMany(
    DEFAULT_DOCUMENT_TYPES.map((dt) => ({ ...dt, companyId }))
  );
};

/**
 * ➕ Add a company-specific document type
 */
export const createDocumentType = async (req: AuthRequest, res: Response) => {
  try {
    const { label, description } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ message: "Document name is required" });
    }

    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ message: "No company context found for this account" });
    }

    const key = slugifyKey(label);
    if (!key) {
      return res.status(400).json({ message: "Document name must contain at least one letter or number" });
    }

    const existing = await DocumentType.findOne({ companyId, key });
    if (existing) {
      return res.status(400).json({ message: "A document type with this name already exists" });
    }

    const documentType = await DocumentType.create({
      key,
      label: label.trim(),
      description: description?.trim() || "",
      companyId,
    });

    res.status(201).json({ message: "Document type added successfully", documentType });
  } catch (error: any) {
    console.error("Create document type error:", error);
    res.status(500).json({ message: "Failed to add document type", error: error.message });
  }
};

/**
 * 📋 Get all document types visible to this account (company-scoped)
 */
export const getAllDocumentTypes = async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {};
    if (!req.user.isSystemAdmin && req.user.role !== ROLES.HRMSAdmin) {
      filter.companyId = req.user.companyId;
    }

    const documentTypes = await DocumentType.find(filter).sort({ createdAt: 1 });
    res.json(documentTypes);
  } catch (error: any) {
    console.error("Get document types error:", error);
    res.status(500).json({ message: "Failed to fetch document types", error: error.message });
  }
};

/**
 * ✏️ Update a document type's label/description (key stays stable so
 * already-uploaded employee documents never lose their association)
 */
export const updateDocumentType = async (req: AuthRequest, res: Response) => {
  try {
    const { label, description } = req.body;

    const documentType = await DocumentType.findById(req.params.id);
    if (!documentType) {
      return res.status(404).json({ message: "Document type not found" });
    }

    if (
      !req.user.isSystemAdmin &&
      req.user.role !== ROLES.HRMSAdmin &&
      String(documentType.companyId) !== String(req.user.companyId)
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (label && label.trim()) documentType.label = label.trim();
    if (description !== undefined) documentType.description = description.trim();
    await documentType.save();

    res.json({ message: "Document type updated successfully", documentType });
  } catch (error: any) {
    console.error("Update document type error:", error);
    res.status(500).json({ message: "Failed to update document type", error: error.message });
  }
};

/**
 * 🗑️ Delete a document type
 */
export const deleteDocumentType = async (req: AuthRequest, res: Response) => {
  try {
    const documentType = await DocumentType.findById(req.params.id);
    if (!documentType) {
      return res.status(404).json({ message: "Document type not found" });
    }

    if (
      !req.user.isSystemAdmin &&
      req.user.role !== ROLES.HRMSAdmin &&
      String(documentType.companyId) !== String(req.user.companyId)
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    await DocumentType.findByIdAndDelete(req.params.id);
    res.json({ message: "Document type deleted successfully" });
  } catch (error: any) {
    console.error("Delete document type error:", error);
    res.status(500).json({ message: "Failed to delete document type", error: error.message });
  }
};
