import mongoose from "mongoose";
import { dbName } from "../constants";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!, {
      dbName,
    });
    console.log("MongoDB connected");
  } catch (err: any) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};
