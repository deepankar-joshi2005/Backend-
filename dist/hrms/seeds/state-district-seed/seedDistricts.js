"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const constants_1 = require("../../constants");
const District_1 = __importDefault(require("../../models/state-district/District"));
const districtsData_1 = require("../../models/state-district/districtsData");
dotenv_1.default.config();
const run = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI, { dbName: constants_1.dbName });
        console.log("✅ Connected to MongoDB");
        console.log("🌱 Seeding districts...");
        await District_1.default.deleteMany({});
        await District_1.default.insertMany(districtsData_1.districtsData);
        console.log(`✅ ${districtsData_1.districtsData.length} Districts seeded successfully`);
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Error seeding districts:", error);
        process.exit(1);
    }
};
run();
