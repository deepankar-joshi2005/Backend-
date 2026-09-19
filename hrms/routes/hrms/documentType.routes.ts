/** @format */

import { Router } from "express";
import {
  createDocumentType,
  getAllDocumentTypes,
  updateDocumentType,
  deleteDocumentType,
} from "../../controllers/hrms/documentTypeController";
import { authMiddleware } from "../../middleware/auth";

const DocumentTypeRouter = Router();

DocumentTypeRouter.get("/", authMiddleware, getAllDocumentTypes);
DocumentTypeRouter.post("/", authMiddleware, createDocumentType);
DocumentTypeRouter.put("/:id", authMiddleware, updateDocumentType);
DocumentTypeRouter.delete("/:id", authMiddleware, deleteDocumentType);

export default DocumentTypeRouter;
