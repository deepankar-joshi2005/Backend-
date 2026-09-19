import path from 'path';
import fs from 'fs';

/**
 * Get the correct uploads directory path that works in both development and production
 * This function ensures uploads always go to the root uploads folder, not dist/uploads
 */
export const getUploadsPath = (subPath: string = ''): string => {
  // Get the current working directory
  const cwd = process.cwd();
  
  // Check if we're running from dist/ directory (production)
  if (cwd.endsWith('dist') || cwd.includes('dist')) {
    // If we're in dist/, go up one level to get to backend/
    const backendDir = path.dirname(cwd);
    return path.join(backendDir, 'uploads', subPath);
  }
  
  // For development or if we're already in the backend directory
  return path.join(cwd, 'uploads', subPath);
};

/**
 * Ensure upload directory exists
 */
export const ensureUploadDir = (uploadPath: string): void => {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
};

/**
 * Get the correct file path for uploads
 */
export const getUploadFilePath = (subPath: string, fileName: string): string => {
  const uploadsDir = getUploadsPath(subPath);
  ensureUploadDir(uploadsDir);
  return path.join(uploadsDir, fileName);
};

/**
 * Get the URL path for serving files
 */
export const getUploadUrl = (subPath: string, fileName: string): string => {
  return `/uploads/${subPath}/${fileName}`;
};
