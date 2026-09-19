"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentTypeController_1 = require("../../controllers/hrms/documentTypeController");
const auth_1 = require("../../middleware/auth");
const DocumentTypeRouter = (0, express_1.Router)();
DocumentTypeRouter.get("/", auth_1.authMiddleware, documentTypeController_1.getAllDocumentTypes);
DocumentTypeRouter.post("/", auth_1.authMiddleware, documentTypeController_1.createDocumentType);
DocumentTypeRouter.put("/:id", auth_1.authMiddleware, documentTypeController_1.updateDocumentType);
DocumentTypeRouter.delete("/:id", auth_1.authMiddleware, documentTypeController_1.deleteDocumentType);
exports.default = DocumentTypeRouter;
