import multer from "multer";
import path from "path";
import crypto from "crypto";
import { getUploadsPath, ensureUploadDir } from "../hrms/utils/uploadPaths";

const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getUploadsPath("compliance");
    ensureUploadDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const complianceUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return cb(new Error("Unsupported file type. Allowed: PDF, JPG, PNG, DOC, XLS."));
    cb(null, true);
  },
});
