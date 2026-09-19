"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const constants_1 = require("../constants");
const Company_1 = __importDefault(require("../models/hrms/Company"));
const DocumentType_1 = __importDefault(require("../models/hrms/DocumentType"));
const documentTypeController_1 = require("../controllers/hrms/documentTypeController");
dotenv_1.default.config();
const run = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI, { dbName: constants_1.dbName });
        console.log("✅ Connected to MongoDB");
        const companies = await Company_1.default.find({}, "_id name");
        let seededCount = 0;
        for (const company of companies) {
            const existing = await DocumentType_1.default.countDocuments({ companyId: company._id });
            if (existing > 0) {
                console.log(`⏭️  Skipping "${company.name}" — already has ${existing} document type(s)`);
                continue;
            }
            await DocumentType_1.default.insertMany(documentTypeController_1.DEFAULT_DOCUMENT_TYPES.map((dt) => ({ ...dt, companyId: company._id })));
            seededCount++;
            console.log(`✅ Seeded default document types for "${company.name}"`);
        }
        console.log(`\n🎉 Done. Seeded ${seededCount} of ${companies.length} companies.`);
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Error seeding document types:", err.message);
        process.exit(1);
    }
};
run();
