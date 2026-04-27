const express = require("express");
const Ticket = require("../models/Ticket");
const TicketHistory = require("../models/TicketHistory");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const { processNewTicket } = require("../lib/ai/orchestrator");
const router = express.Router();

// GET /api/tickets — list with filters
router.get("/", auth, async (req, res) => {
  try {
    const { status, priority, assignee, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assigneeId = assignee;

    // Operators see only their tickets
    if (req.user.role === "operator") filter.assigneeId = req.user._id;

    const tickets = await Ticket.find(filter)
      .populate("clientId", "name company")
      .populate("assigneeId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Ticket.countDocuments(filter);

    res.json({ tickets, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id — single ticket with history
router.get("/:id", auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("clientId")
      .populate("assigneeId", "name email role")
      .populate("createdBy", "name");

    if (!ticket) return res.status(404).json({ error: "Заявка не найдена" });

    const history = await TicketHistory.find({ ticketId: ticket._id })
      .populate("performedBy", "name")
      .sort({ createdAt: 1 });

    res.json({ ticket, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets — create + trigger AI
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, clientId } = req.body;
    if (!title || !description || !clientId) {
      return res.status(400).json({ error: "Заполните все обязательные поля" });
    }

    const ticket = await Ticket.create({
      title,
      description,
      clientId,
      createdBy: req.user._id,
      status: "new",
    });

    // Log creation
    await TicketHistory.create({
      ticketId: ticket._id,
      action: "created",
      newValue: "new",
      performedBy: req.user._id,
      comment: `Заявка создана: ${title}`,
    });

    // Run AI pipeline (async but we await for demo — instant with Groq)
    let aiResult = null;
    try {
      aiResult = await processNewTicket(ticket._id);
    } catch (aiErr) {
      console.error("AI processing error:", aiErr.message);
      // Ticket still created, AI just didn't process
    }

    // Re-fetch with populated fields
    const populated = await Ticket.findById(ticket._id)
      .populate("clientId", "name company")
      .populate("assigneeId", "name");

    res.status(201).json({ ticket: populated, aiResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tickets/:id — update status, assignee, etc.
router.put("/:id", auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Заявка не найдена" });

    const { status, assigneeId, priority } = req.body;

    if (status && status !== ticket.status) {
      await TicketHistory.create({
        ticketId: ticket._id,
        action: "status_changed",
        oldValue: ticket.status,
        newValue: status,
        performedBy: req.user._id,
      });

      ticket.status = status;
      if (status === "in_progress" && !ticket.firstResponseAt) {
        ticket.firstResponseAt = new Date();
      }
      if (status === "resolved") ticket.resolvedAt = new Date();
    }

    if (assigneeId && assigneeId !== ticket.assigneeId?.toString()) {
      // Decrease old assignee load
      if (ticket.assigneeId) {
        await User.findByIdAndUpdate(ticket.assigneeId, { $inc: { currentLoad: -1 } });
      }
      // Increase new assignee load
      await User.findByIdAndUpdate(assigneeId, { $inc: { currentLoad: 1 } });

      await TicketHistory.create({
        ticketId: ticket._id,
        action: "assigned",
        oldValue: ticket.assigneeId?.toString(),
        newValue: assigneeId,
        performedBy: req.user._id,
      });
      ticket.assigneeId = assigneeId;
    }

    if (priority && priority !== ticket.priority) {
      await TicketHistory.create({
        ticketId: ticket._id,
        action: "priority_changed",
        oldValue: ticket.priority,
        newValue: priority,
        performedBy: req.user._id,
      });
      ticket.priority = priority;
    }

    await ticket.save();

    const populated = await Ticket.findById(ticket._id)
      .populate("clientId", "name company")
      .populate("assigneeId", "name");

    res.json({ ticket: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
