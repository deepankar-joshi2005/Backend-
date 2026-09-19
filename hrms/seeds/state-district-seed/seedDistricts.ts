import mongoose from "mongoose";
import dotenv from "dotenv";
import { dbName } from "../../constants";
import District from "../../models/state-district/District";
import { districtsData } from "../../models/state-district/districtsData";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, { dbName });
    console.log("✅ Connected to MongoDB");

    console.log("🌱 Seeding districts...");
    await District.deleteMany({});
    await District.insertMany(districtsData);

    console.log(`✅ ${districtsData.length} Districts seeded successfully`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding districts:", error);
    process.exit(1);
  }
};

run();
