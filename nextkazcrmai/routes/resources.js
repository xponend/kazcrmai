const express = require("express");
const Client = require("../models/Client");
const User = require("../models/User");
const { auth, requireRole } = require("../middleware/auth");

const clientRouter = express.Router();
const userRouter = express.Router();

// --- CLIENTS ---
clientRouter.get("/", auth, async (req, res) => {
  try {
    const { search } = req.query;
    const filter = search
      ? { $or: [{ name: new RegExp(search, "i") }, { company: new RegExp(search, "i") }] }
      : {};
    const clients = await Client.find(filter).sort({ name: 1 });
    res.json({ clients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

clientRouter.get("/:id", auth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: "Клиент не найден" });
    res.json({ client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

clientRouter.post("/", auth, async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json({ client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- USERS (operators list) ---
userRouter.get("/", auth, async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select("-password").sort({ name: 1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

userRouter.get("/operators", auth, async (req, res) => {
  try {
    const operators = await User.find({ role: "operator", isActive: true })
      .select("name skills currentLoad")
      .sort({ currentLoad: 1 });
    res.json({ operators });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { clientRouter, userRouter };
