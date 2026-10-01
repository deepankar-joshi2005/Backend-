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

    // WhatsApp messages included per CA firm per month, by tier — Multi-Tenancy
    // & Licensing doc, Sections 5/6 ("included quota, then pay-as-you-go").
    // null = custom/unlimited (Enterprise). Usage beyond the quota is not blocked;
    // it's counted as overage and billed to the CA firm at whatsappOverageRate.
    whatsappQuotaStarter: { type: Number, default: 300 },
    whatsappQuotaGrowth: { type: Number, default: 1500 },
    whatsappQuotaEnterprise: { type: Number, default: null },
    whatsappOverageRate: { type: Number, default: 1 },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("SystemSettings", systemSettingsSchema);
