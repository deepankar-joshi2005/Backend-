"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUser = sanitizeUser;
// Mongoose's `select: false` on passwordHash only filters query results
// (find/findOne) — documents returned by .create()/.save() still carry it
// in memory, so every response must be explicitly sanitized before sending.
function sanitizeUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        caFirmId: user.caFirmId,
        businessClientId: user.businessClientId,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
