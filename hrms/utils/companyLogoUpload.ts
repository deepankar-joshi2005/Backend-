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

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
        cb(null, true);
    } else {
        cb(new Error("Only .jpeg and .png formats are allowed!"), false);
    }
};

export const companyLogoUpload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 2, // 2MB
    },
    fileFilter: fileFilter,
});