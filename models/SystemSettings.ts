import mongoose from "mongoose";

// Singleton document (a single row holds platform-wide settings).
const systemSettingsSchema = new mongoose.Schema(
  {
    platformName: { type: String, default: "Praxis" },
    supportEmail: { type: String, default: "" },
    maintenanceMode: { type: Boolean, default: false },

    // Subscription defaults — edited from the Super Admin Settings page.
    defaultTrialDays: { type: Number, default: 14 },
    starterPrice: { type: Number, default: 1999 },
    growthPrice: { type: Number, default: 4999 },
    enterprisePrice: { type: Number, default: 14999 },
    currency: { type: String, default: "INR" },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("SystemSettings", systemSettingsSchema);
