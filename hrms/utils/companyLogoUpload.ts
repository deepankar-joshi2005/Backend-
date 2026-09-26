/** @format */

import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure company-logos directory exists
const uploadDir = path.join(__dirname, "../../uploads/company-logos");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "logo-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const ALLOWED_MIMETYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const fileFilter = (req: any, file: any, cb: any) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        // statusCode lets the shared errorHandler return 400 instead of
        // falling through to a generic 500 for this rejection.
        cb(Object.assign(new Error("Only JPEG, PNG, or WEBP images are allowed."), { statusCode: 400 }), false);
    }
};

export const companyLogoUpload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 2, // 2MB
    },
    fileFilter: fileFilter,
});