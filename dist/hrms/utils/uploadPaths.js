"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadUrl = exports.getUploadFilePath = exports.ensureUploadDir = exports.getUploadsPath = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Get the correct uploads directory path that works in both development and production
 * This function ensures uploads always go to the root uploads folder, not dist/uploads
 */
const getUploadsPath = (subPath = '') => {
    // Get the current working directory
    const cwd = process.cwd();
    // Check if we're running from dist/ directory (production)
    if (cwd.endsWith('dist') || cwd.includes('dist')) {
        // If we're in dist/, go up one level to get to backend/
        const backendDir = path_1.default.dirname(cwd);
        return path_1.default.join(backendDir, 'uploads', subPath);
    }
    // For development or if we're already in the backend directory
    return path_1.default.join(cwd, 'uploads', subPath);
};
exports.getUploadsPath = getUploadsPath;
/**
 * Ensure upload directory exists
 */
const ensureUploadDir = (uploadPath) => {
    if (!fs_1.default.existsSync(uploadPath)) {
        fs_1.default.mkdirSync(uploadPath, { recursive: true });
    }
};
exports.ensureUploadDir = ensureUploadDir;
/**
 * Get the correct file path for uploads
 */
const getUploadFilePath = (subPath, fileName) => {
    const uploadsDir = (0, exports.getUploadsPath)(subPath);
    (0, exports.ensureUploadDir)(uploadsDir);
    return path_1.default.join(uploadsDir, fileName);
};
exports.getUploadFilePath = getUploadFilePath;
/**
 * Get the URL path for serving files
 */
const getUploadUrl = (subPath, fileName) => {
    return `/uploads/${subPath}/${fileName}`;
};
exports.getUploadUrl = getUploadUrl;
