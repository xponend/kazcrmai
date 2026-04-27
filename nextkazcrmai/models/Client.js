const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  company: { type: String },
  totalTickets: { type: Number, default: 0 },
  avgSatisfaction: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Client", clientSchema);
