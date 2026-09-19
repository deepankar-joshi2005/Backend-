/** @format */
import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/hr-policies");
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  if (
    file.mimetype === "application/pdf" ||
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/msword" ||
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, Word documents, or images allowed"));
  }
};

export const hrPolicyUpload = multer({ storage, fileFilter });
