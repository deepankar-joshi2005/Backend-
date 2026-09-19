import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", required: true },
    fromName: { type: String, required: true },
    fromRole: { type: String, required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const supportTicketSchema = new mongoose.Schema(
  {
    caFirmId: { type: mongoose.Schema.Types.ObjectId, ref: "CaFirm", required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CaUser", required: true },
    subject: { type: String, required: true, trim: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open" },
    messages: [messageSchema],
  },
  { timestamps: true }
);

supportTicketSchema.index({ caFirmId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1 });

export default mongoose.model("SupportTicket", supportTicketSchema);
