import mongoose from "mongoose";

const stateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    country: { type: String, required: true, default: "India" },
  },
  { timestamps: true }
);

export default mongoose.model("State", stateSchema);
