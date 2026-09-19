"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAdminPassword = exports.generateCommonPassword = void 0;
// Generate unique password for users
const generateCommonPassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 random digits
    return `Welcome${randomDigits}`;
};
exports.generateCommonPassword = generateCommonPassword;
// Generate a more secure password for admin users
const generateAdminPassword = () => {
    const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 random digits
    return `Admin${randomDigits}`;
};
exports.generateAdminPassword = generateAdminPassword;
