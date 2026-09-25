/** @format */
import multer from "multer";
import path from "path";
import fs from "fs";
import { getUploadUrl } from "./uploadPaths";

const uploadsDir = path.join(process.cwd(), "uploads", "training-media");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "module-" + unique + path.extname(file.originalname));
  },
});

const ALLOWED_EXTENSIONS = [".pdf", ".ppt", ".pptx", ".mp4", ".mov", ".mkv", ".avi", ".webm"];

const fileFilter = (_req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetypeOk =
    file.mimetype.startsWith("video/") ||
    file.mimetype === "application/pdf" ||
    file.mimetype === "application/vnd.ms-powerpoint" ||
    file.mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation";

  // OR condition (not AND): some browsers/OSes mislabel the mimetype for
  // video containers, so a correct extension is accepted on its own.
  if (mimetypeOk || ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only video, PDF, or PPT/PPTX files are allowed"));
  }
};

export const trainingUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 150 * 1024 * 1024, files: 5 }, // 150MB/file, max 5 files/request
});

export const inferContentType = (mimetype: string, originalname: string): "Video" | "PDF" | "PPT" => {
  const ext = path.extname(originalname).toLowerCase();
  if (mimetype === "application/pdf" || ext === ".pdf") return "PDF";
  if (mimetype.includes("powerpoint") || mimetype.includes("presentation") || [".ppt", ".pptx"].includes(ext)) {
    return "PPT";
  }
  return "Video";
};

export const buildTrainingMediaUrl = (filename: string): string => getUploadUrl("training-media", filename);
