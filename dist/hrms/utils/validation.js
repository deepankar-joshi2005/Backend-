"use strict";
/**
 * Validation utility functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPhoneNumber = exports.isValidEmail = exports.isValidPhoneNumber = void 0;
/**
 * Validates if a phone number is in a valid format
 * Accepts:
 * - 10 digit numbers (e.g., 9876543210)
 * - Numbers with +91 country code (e.g., +919876543210)
 * - Numbers with spaces/dashes (e.g., +91 98765 43210, 98765-43210)
 *
 * @param phoneNumber - The phone number to validate
 * @returns boolean - true if valid, false otherwise
 */
const isValidPhoneNumber = (phoneNumber) => {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        return false;
    }
    // Remove all spaces, dashes, and parentheses for validation
    const cleanedNumber = phoneNumber.replace(/[\s\-()]/g, '');
    // Pattern 1: 10 digit number
    const pattern1 = /^[6-9]\d{9}$/;
    // Pattern 2: +91 followed by 10 digits
    const pattern2 = /^\+91[6-9]\d{9}$/;
    // Pattern 3: 91 followed by 10 digits (without +)
    const pattern3 = /^91[6-9]\d{9}$/;
    return pattern1.test(cleanedNumber) || pattern2.test(cleanedNumber) || pattern3.test(cleanedNumber);
};
exports.isValidPhoneNumber = isValidPhoneNumber;
/**
 * Validates if an email is in a valid format
 *
 * @param email - The email to validate
 * @returns boolean - true if valid, false otherwise
 */
const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return false;
    }
    // Basic email validation pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim().toLowerCase());
};
exports.isValidEmail = isValidEmail;
/**
 * Formats a phone number for display
 * Converts various formats to a consistent format
 *
 * @param phoneNumber - The phone number to format
 * @returns string - Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) {
        return phoneNumber;
    }
    // Remove all non-numeric characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    // If it starts with +91, keep it
    if (cleaned.startsWith('+91')) {
        return cleaned;
    }
    // If it starts with 91 and has 12 digits, add +
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        return '+' + cleaned;
    }
    // If it's a 10 digit number, add +91
    if (cleaned.length === 10) {
        return '+91' + cleaned;
    }
    return cleaned;
};
exports.formatPhoneNumber = formatPhoneNumber;
