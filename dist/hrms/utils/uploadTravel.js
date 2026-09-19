"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.travelUpload = void 0;
/** @format */
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, "uploads/travel");
    },
    filename: (_req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path_1.default.extname(file.originalname));
    },
});
const fileFilter = (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") ||
        file.mimetype === "application/pdf") {
        cb(null, true);
    }
    else {
        cb(new Error("Only image or PDF allowed"));
    }
};
exports.travelUpload = (0, multer_1.default)({
    storage,
    fileFilter,
});
