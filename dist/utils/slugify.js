"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueSlug = generateUniqueSlug;
const CaFirm_1 = __importDefault(require("../models/CaFirm"));
function toSlug(text) {
    return (text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "firm");
}
// Generates a unique slug for a CaFirm, appending a numeric suffix on collision.
async function generateUniqueSlug(name) {
    const base = toSlug(name);
    let slug = base;
    let counter = 1;
    while (await CaFirm_1.default.exists({ slug })) {
        counter += 1;
        slug = `${base}-${counter}`;
    }
    return slug;
}
