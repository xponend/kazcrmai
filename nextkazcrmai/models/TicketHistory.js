const mongoose = require("mongoose");

const ticketHistorySchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
  action: {
    type: String,
    enum: ["created", "status_changed", "assigned", "priority_changed", "ai_processed", "comment"],
    required: true,
  },
  oldValue: { type: String },
  newValue: { type: String },
  comment: { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

ticketHistorySchema.index({ ticketId: 1, createdAt: -1 });

module.exports = mongoose.model("TicketHistory", ticketHistorySchema);
