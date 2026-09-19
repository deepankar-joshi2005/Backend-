"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPagination = getPagination;
exports.buildMeta = buildMeta;
function getPagination(query) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
function buildMeta({ page, limit, total }) {
    return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
