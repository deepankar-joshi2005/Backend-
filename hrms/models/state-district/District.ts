import mongoose from "mongoose";

const districtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    state: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
      required: true,
    },
    country: { type: String, required: true, default: "India" },
  },
  { timestamps: true }
);

export default mongoose.model("District", districtSchema);
