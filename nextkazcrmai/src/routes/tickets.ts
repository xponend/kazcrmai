import { Router, type RequestHandler } from "express";
import { Ticket, type TicketPriority, type TicketStatus } from "../models/Ticket";
import { TicketHistory } from "../models/TicketHistory";
import { User } from "../models/User";
import { auth } from "../middleware/auth";
import { processNewTicket } from "../lib/ai/orchestrator";

const router = Router();

const list: RequestHandler = async (req, res) => {
  try {
    const { status, priority, assignee } = req.query as {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignee?: string;
    };
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assigneeId = assignee;

    if (req.user!.role === "operator") filter.assigneeId = req.user!._id;

    const tickets = await Ticket.find(filter)
      .populate("clientId", "name company")
      .populate("assigneeId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Ticket.countDocuments(filter);
    res.json({ tickets, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

const get: RequestHandler = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("clientId")
      .populate("assigneeId", "name email role")
      .populate("createdBy", "name");
    if (!ticket) {
      res.status(404).json({ error: "Заявка не найдена" });
      return;
    }
    const history = await TicketHistory.find({ ticketId: ticket._id })
      .populate("performedBy", "name")
      .sort({ createdAt: 1 });
    res.json({ ticket, history });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

const create: RequestHandler = async (req, res) => {
  try {
    const { title, description, clientId } = req.body as {
      title?: string;
      description?: string;
      clientId?: string;
    };
    if (!title || !description || !clientId) {
      res.status(400).json({ error: "Заполните все обязательные поля" });
      return;
    }

    const ticket = await Ticket.create({
      title,
      description,
      clientId,
      createdBy: req.user!._id,
      status: "new",
    });

    await TicketHistory.create({
      ticketId: ticket._id,
      action: "created",
      newValue: "new",
      performedBy: req.user!._id,
      comment: `Заявка создана: ${title}`,
    });

    let aiResult: Awaited<ReturnType<typeof processNewTicket>> | null = null;
    try {
      aiResult = await processNewTicket(ticket._id);
    } catch (err) {
      console.error("AI processing error:", (err as Error).message);
    }

    const populated = await Ticket.findById(ticket._id)
      .populate("clientId", "name company")
      .populate("assigneeId", "name");

    res.status(201).json({ ticket: populated, aiResult });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

const update: RequestHandler = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404).json({ error: "Заявка не найдена" });
      return;
    }
    const { status, assigneeId, priority } = req.body as {
      status?: TicketStatus;
      assigneeId?: string;
      priority?: TicketPriority;
    };

    if (status && status !== ticket.status) {
      await TicketHistory.create({
        ticketId: ticket._id,
        action: "status_changed",
        oldValue: ticket.status,
        newValue: status,
        performedBy: req.user!._id,
      });
      ticket.status = status;
      if (status === "in_progress" && !ticket.firstResponseAt) ticket.firstResponseAt = new Date();
      if (status === "resolved") ticket.resolvedAt = new Date();
    }

    if (assigneeId && assigneeId !== String(ticket.assigneeId ?? "")) {
      if (ticket.assigneeId) await User.findByIdAndUpdate(ticket.assigneeId, { $inc: { currentLoad: -1 } });
      await User.findByIdAndUpdate(assigneeId, { $inc: { currentLoad: 1 } });
      await TicketHistory.create({
        ticketId: ticket._id,
        action: "assigned",
        oldValue: ticket.assigneeId ? String(ticket.assigneeId) : undefined,
        newValue: assigneeId,
        performedBy: req.user!._id,
      });
      ticket.set("assigneeId", assigneeId);
    }

    if (priority && priority !== ticket.priority) {
      await TicketHistory.create({
        ticketId: ticket._id,
        action: "priority_changed",
        oldValue: ticket.priority,
        newValue: priority,
        performedBy: req.user!._id,
      });
      ticket.priority = priority;
    }

    await ticket.save();

    const populated = await Ticket.findById(ticket._id)
      .populate("clientId", "name company")
      .populate("assigneeId", "name");
    res.json({ ticket: populated });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

router.get("/", auth, list);
router.get("/:id", auth, get);
router.post("/", auth, create);
router.put("/:id", auth, update);

export default router;
