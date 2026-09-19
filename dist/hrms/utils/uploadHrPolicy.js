"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrPolicyUpload = void 0;
/** @format */
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, "uploads/hr-policies");
    },
    filename: (_req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path_1.default.extname(file.originalname));
    },
});
const fileFilter = (_req, file, cb) => {
    if (file.mimetype === "application/pdf" ||
        file.mimetype.startsWith("image/") ||
        file.mimetype === "application/msword" ||
        file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        cb(null, true);
    }
    else {
        cb(new Error("Only PDF, Word documents, or images allowed"));
    }
};
exports.hrPolicyUpload = (0, multer_1.default)({ storage, fileFilter });
