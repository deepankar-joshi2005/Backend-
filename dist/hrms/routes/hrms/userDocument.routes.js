"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userDocumentController_1 = require("../../controllers/hrms/userDocumentController");
const employeeBulkUploadController_1 = require("../../controllers/hrms/employeeBulkUploadController");
const auth_1 = require("../../middleware/auth");
const uploadUserDocument_1 = require("../../utils/uploadUserDocument");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const userDocumentRouter = (0, express_1.Router)();
// Apply auth middleware to all routes in this router
userDocumentRouter.use(auth_1.authMiddleware);
/* ================= ONBOARDING CHECKLIST ================= */
userDocumentRouter.get("/onboarding/checklist", userDocumentController_1.getOnboardingChecklist);
/* ================= EMPLOYEE KYC DOCUMENTS ================= */
userDocumentRouter.post("/upload/:userId", uploadUserDocument_1.userDocumentUpload.any(), userDocumentController_1.uploadDocument);
userDocumentRouter.put("/update/:id", uploadUserDocument_1.userDocumentUpload.any(), userDocumentController_1.updateDocument);
userDocumentRouter.get("/user/:userId", userDocumentController_1.getDocumentsByUser);
userDocumentRouter.get("/all", userDocumentController_1.getAllDocuments);
userDocumentRouter.patch("/:id/status", userDocumentController_1.setDocumentStatus);
/* ================= BULK UPLOAD (Legacy Support) ================= */
// Maintaining these here because they were previously mapped to /api/documents
userDocumentRouter.post("/parse", upload.single("file"), employeeBulkUploadController_1.parseEmployeeBulk);
userDocumentRouter.post("/save", employeeBulkUploadController_1.saveEmployeeBulk);
exports.default = userDocumentRouter;
