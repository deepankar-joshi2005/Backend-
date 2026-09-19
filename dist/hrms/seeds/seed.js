"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const constants_1 = require("../constants");
dotenv_1.default.config();
const run = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI, {
            dbName: constants_1.dbName,
        });
        console.log("✅ Connected to MongoDB");
        const email = process.env.SUPERADMIN_EMAIL;
        const password = process.env.SUPERADMIN_PASS;
        if (!email || !password) {
            console.error("❌ SUPERADMIN_EMAIL and SUPERADMIN_PASS must be set in .env");
            process.exit(1);
        }
        let superadmin = await User_1.default.findOne({ role: "superadmin" });
        if (superadmin) {
            console.log("⚠️ SuperAdmin already exists. Updating password...");
            superadmin.password = password;
            await superadmin.save();
            console.log("✅ SuperAdmin password updated:", superadmin.email);
        }
        else {
            superadmin = await User_1.default.create({
                name: "System SuperAdmin",
                email,
                password: password, // Model will hash this
                role: constants_1.ROLES.SuperAdmin,
                isVerified: true,
                isSystemAdmin: true,
            });
            console.log("✅ SuperAdmin created:", superadmin.email);
        }
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Error seeding SuperAdmin:", err.message);
        process.exit(1);
    }
};
run();
