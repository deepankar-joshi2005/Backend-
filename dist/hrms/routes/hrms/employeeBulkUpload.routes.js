"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeeBulkUploadController_1 = require("../../controllers/hrms/employeeBulkUploadController");
const auth_1 = require("../../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const bulkUploadRouter = (0, express_1.Router)();
bulkUploadRouter.use(auth_1.authMiddleware);
bulkUploadRouter.post("/parse", upload.single("file"), employeeBulkUploadController_1.parseEmployeeBulk);
bulkUploadRouter.post("/save", employeeBulkUploadController_1.saveEmployeeBulk);
exports.default = bulkUploadRouter;
