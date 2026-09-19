import mongoose from "mongoose";
import dotenv from "dotenv";
import { dbName } from "../../constants";
import State from "../../models/state-district/State";
import { statesData } from "../../models/state-district/statesData";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {
      dbName,
    });
    console.log("✅ Connected to MongoDB");

    console.log("🌱 Seeding states...");

    await State.deleteMany({});
    await State.insertMany(statesData);

    console.log(`✅ ${statesData.length} States seeded successfully`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding states:", error);
    process.exit(1);
  }
};

run();
