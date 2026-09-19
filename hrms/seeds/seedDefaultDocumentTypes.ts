/** @format */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { dbName } from "../constants";
import Company from "../models/hrms/Company";
import DocumentType from "../models/hrms/DocumentType";
import { DEFAULT_DOCUMENT_TYPES } from "../controllers/hrms/documentTypeController";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, { dbName });
    console.log("✅ Connected to MongoDB");

    const companies = await Company.find({}, "_id name");
    let seededCount = 0;

    for (const company of companies) {
      const existing = await DocumentType.countDocuments({ companyId: company._id });
      if (existing > 0) {
        console.log(`⏭️  Skipping "${company.name}" — already has ${existing} document type(s)`);
        continue;
      }

      await DocumentType.insertMany(
        DEFAULT_DOCUMENT_TYPES.map((dt) => ({ ...dt, companyId: company._id }))
      );
      seededCount++;
      console.log(`✅ Seeded default document types for "${company.name}"`);
    }

    console.log(`\n🎉 Done. Seeded ${seededCount} of ${companies.length} companies.`);
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error seeding document types:", err.message);
    process.exit(1);
  }
};

run();
