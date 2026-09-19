"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const constants_1 = require("../../constants");
const State_1 = __importDefault(require("../../models/state-district/State"));
const statesData_1 = require("../../models/state-district/statesData");
dotenv_1.default.config();
const run = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI, {
            dbName: constants_1.dbName,
        });
        console.log("✅ Connected to MongoDB");
        console.log("🌱 Seeding states...");
        await State_1.default.deleteMany({});
        await State_1.default.insertMany(statesData_1.statesData);
        console.log(`✅ ${statesData_1.statesData.length} States seeded successfully`);
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Error seeding states:", error);
        process.exit(1);
    }
};
run();
