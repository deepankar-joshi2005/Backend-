"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocumentType = exports.updateDocumentType = exports.getAllDocumentTypes = exports.createDocumentType = exports.seedDefaultDocumentTypesForCompany = exports.DEFAULT_DOCUMENT_TYPES = void 0;
const constants_1 = require("../../constants");
const DocumentType_1 = __importDefault(require("../../models/hrms/DocumentType"));
const slugifyKey = (label) => label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
// The KYC document types every company used to get for free before this
// became configurable. New companies are seeded with these on signup so
// they don't start with an empty list; existing companies are backfilled
// once via the seed-document-types script (src/seeds/seedDefaultDocumentTypes.ts).
exports.DEFAULT_DOCUMENT_TYPES = [
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
const seedDefaultDocumentTypesForCompany = async (companyId) => {
    const existingCount = await DocumentType_1.default.countDocuments({ companyId });
    if (existingCount > 0)
        return;
    await DocumentType_1.default.insertMany(exports.DEFAULT_DOCUMENT_TYPES.map((dt) => ({ ...dt, companyId })));
};
exports.seedDefaultDocumentTypesForCompany = seedDefaultDocumentTypesForCompany;
/**
 * ➕ Add a company-specific document type
 */
const createDocumentType = async (req, res) => {
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
        const existing = await DocumentType_1.default.findOne({ companyId, key });
        if (existing) {
            return res.status(400).json({ message: "A document type with this name already exists" });
        }
        const documentType = await DocumentType_1.default.create({
            key,
            label: label.trim(),
            description: (description === null || description === void 0 ? void 0 : description.trim()) || "",
            companyId,
        });
        res.status(201).json({ message: "Document type added successfully", documentType });
    }
    catch (error) {
        console.error("Create document type error:", error);
        res.status(500).json({ message: "Failed to add document type", error: error.message });
    }
};
exports.createDocumentType = createDocumentType;
/**
 * 📋 Get all document types visible to this account (company-scoped)
 */
const getAllDocumentTypes = async (req, res) => {
    try {
        const filter = {};
        if (!req.user.isSystemAdmin && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            filter.companyId = req.user.companyId;
        }
        const documentTypes = await DocumentType_1.default.find(filter).sort({ createdAt: 1 });
        res.json(documentTypes);
    }
    catch (error) {
        console.error("Get document types error:", error);
        res.status(500).json({ message: "Failed to fetch document types", error: error.message });
    }
};
exports.getAllDocumentTypes = getAllDocumentTypes;
/**
 * ✏️ Update a document type's label/description (key stays stable so
 * already-uploaded employee documents never lose their association)
 */
const updateDocumentType = async (req, res) => {
    try {
        const { label, description } = req.body;
        const documentType = await DocumentType_1.default.findById(req.params.id);
        if (!documentType) {
            return res.status(404).json({ message: "Document type not found" });
        }
        if (!req.user.isSystemAdmin &&
            req.user.role !== constants_1.ROLES.HRMSAdmin &&
            String(documentType.companyId) !== String(req.user.companyId)) {
            return res.status(403).json({ message: "Access denied." });
        }
        if (label && label.trim())
            documentType.label = label.trim();
        if (description !== undefined)
            documentType.description = description.trim();
        await documentType.save();
        res.json({ message: "Document type updated successfully", documentType });
    }
    catch (error) {
        console.error("Update document type error:", error);
        res.status(500).json({ message: "Failed to update document type", error: error.message });
    }
};
exports.updateDocumentType = updateDocumentType;
/**
 * 🗑️ Delete a document type
 */
const deleteDocumentType = async (req, res) => {
    try {
        const documentType = await DocumentType_1.default.findById(req.params.id);
        if (!documentType) {
            return res.status(404).json({ message: "Document type not found" });
        }
        if (!req.user.isSystemAdmin &&
            req.user.role !== constants_1.ROLES.HRMSAdmin &&
            String(documentType.companyId) !== String(req.user.companyId)) {
            return res.status(403).json({ message: "Access denied." });
        }
        await DocumentType_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Document type deleted successfully" });
    }
    catch (error) {
        console.error("Delete document type error:", error);
        res.status(500).json({ message: "Failed to delete document type", error: error.message });
    }
};
exports.deleteDocumentType = deleteDocumentType;
