const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ["new", "in_progress", "resolved", "closed"],
    default: "new",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  },
  category: { type: String },
  // AI fields
  aiCategory: { type: String },
  aiConfidence: { type: Number },
  aiScore: { type: Number },
  aiReason: { type: String },
  aiProcessedAt: { type: Date },
  // Relations
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  // Timeline
  resolvedAt: { type: Date },
  firstResponseAt: { type: Date },
}, { timestamps: true });

ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ assigneeId: 1, status: 1 });
ticketSchema.index({ clientId: 1 });

module.exports = mongoose.model("Ticket", ticketSchema);
