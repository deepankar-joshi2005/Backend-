import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../config/db";
import User from "../models/User";

dotenv.config();

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

async function seedSuperAdmin() {
  await connectDB();

  const existing = await User.findOne({ role: "super_admin" });
  if (existing) {
    console.log(`Super admin already exists (${existing.email}). Skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  const email = process.env.SUPER_ADMIN_EMAIL || "admin@praxis.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123";
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

  if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
    console.warn(
      "SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set in .env — using insecure defaults. Set them and change the password after first login."
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const superAdmin = await User.create({
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

  await mongoose.disconnect();
}

seedSuperAdmin().catch((err) => {
  console.error("Failed to seed super admin:", err);
  process.exit(1);
});
