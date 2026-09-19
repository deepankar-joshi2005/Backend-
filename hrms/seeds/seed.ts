import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../models/User";
import { dbName, ROLES } from "../constants";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {
      dbName,
    });
    console.log("✅ Connected to MongoDB");

    const email = process.env.SUPERADMIN_EMAIL as string;
    const password = process.env.SUPERADMIN_PASS as string;

    if (!email || !password) {
      console.error(
        "❌ SUPERADMIN_EMAIL and SUPERADMIN_PASS must be set in .env"
      );
      process.exit(1);
    }

    let superadmin = await User.findOne({ role: "superadmin" });
    if (superadmin) {
      console.log("⚠️ SuperAdmin already exists. Updating password...");
      superadmin.password = password;
      await superadmin.save();
      console.log("✅ SuperAdmin password updated:", superadmin.email);
    } else {
      superadmin = await User.create({
        name: "System SuperAdmin",
        email,
        password: password, // Model will hash this
        role: ROLES.SuperAdmin,
        isVerified: true,
        isSystemAdmin: true,
      });
      console.log("✅ SuperAdmin created:", superadmin.email);
    }
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error seeding SuperAdmin:", err.message);
    process.exit(1);
  }
};

run();
