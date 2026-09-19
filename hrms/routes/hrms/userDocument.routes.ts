/** @format */

import { Router } from "express";
import {
  getOnboardingChecklist,
  uploadDocument,
  updateDocument,
  getDocumentsByUser,
  getAllDocuments,
  setDocumentStatus,
} from "../../controllers/hrms/userDocumentController";
import { parseEmployeeBulk, saveEmployeeBulk } from "../../controllers/hrms/employeeBulkUploadController";
import { authMiddleware } from "../../middleware/auth";
import { userDocumentUpload } from "../../utils/uploadUserDocument";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const userDocumentRouter = Router();

// Apply auth middleware to all routes in this router
userDocumentRouter.use(authMiddleware);

/* ================= ONBOARDING CHECKLIST ================= */
userDocumentRouter.get("/onboarding/checklist", getOnboardingChecklist);

/* ================= EMPLOYEE KYC DOCUMENTS ================= */
userDocumentRouter.post("/upload/:userId", userDocumentUpload.any(), uploadDocument);
userDocumentRouter.put("/update/:id", userDocumentUpload.any(), updateDocument);
userDocumentRouter.get("/user/:userId", getDocumentsByUser);
userDocumentRouter.get("/all", getAllDocuments);
userDocumentRouter.patch("/:id/status", setDocumentStatus);

/* ================= BULK UPLOAD (Legacy Support) ================= */
// Maintaining these here because they were previously mapped to /api/documents
userDocumentRouter.post("/parse", upload.single("file"), parseEmployeeBulk);
userDocumentRouter.post("/save", saveEmployeeBulk);

export default userDocumentRouter;
