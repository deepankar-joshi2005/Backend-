"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = __importDefault(require("../config/db"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
async function seedSuperAdmin() {
    await (0, db_1.default)();
    const existing = await User_1.default.findOne({ role: "super_admin" });
    if (existing) {
        console.log(`Super admin already exists (${existing.email}). Skipping seed.`);
        await mongoose_1.default.disconnect();
        return;
    }
    const email = process.env.SUPER_ADMIN_EMAIL || "admin@praxis.com";
    const password = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123";
    const name = process.env.SUPER_ADMIN_NAME || "Super Admin";
    if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
        console.warn("SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set in .env — using insecure defaults. Set them and change the password after first login.");
    }
    const passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
    const superAdmin = await User_1.default.create({
        name,
        email,
        passwordHash,
        role: "super_admin",
        caFirmId: null,
    });
    console.log("Super admin created:");
    console.log(`  Email:    ${superAdmin.email}`);
    console.log(`  Password: ${password}`);
    console.log("Log in and change the password after first login.");
    await mongoose_1.default.disconnect();
}
seedSuperAdmin().catch((err) => {
    console.error("Failed to seed super admin:", err);
    process.exit(1);
});
