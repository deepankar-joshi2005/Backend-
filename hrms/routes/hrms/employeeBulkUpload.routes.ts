/** @format */

import { Router } from "express";
import { parseEmployeeBulk, saveEmployeeBulk } from "../../controllers/hrms/employeeBulkUploadController";
import { authMiddleware } from "../../middleware/auth";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const bulkUploadRouter = Router();

bulkUploadRouter.use(authMiddleware);

bulkUploadRouter.post("/parse", upload.single("file"), parseEmployeeBulk);
bulkUploadRouter.post("/save", saveEmployeeBulk);

export default bulkUploadRouter;
