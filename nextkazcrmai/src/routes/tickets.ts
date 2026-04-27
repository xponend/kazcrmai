import { Router, type RequestHandler } from "express";
import { Ticket, type TicketPriority, type TicketStatus } from "../models/Ticket";
import { TicketHistory } from "../models/TicketHistory";
import { User } from "../models/User";
import { auth } from "../middleware/auth";
import { processNewTicket } from "../lib/ai/orchestrator";
import { suggestReplies, summarizeTicket } from "../lib/ai/assist";
import { clampInt, isObjectId, isNonEmptyString } from "../lib/validate";

const router = Router();

const STATUSES: ReadonlySet<TicketStatus> = new Set(["new", "in_progress", "resolved", "closed"]);
const PRIORITIES: ReadonlySet<TicketPriority> = new Set(["low", "medium", "high", "critical"]);

function fail(res: Parameters<RequestHandler>[1], status: number, error: string, code?: string) {
  res.status(status).json(code ? { error, code } : { error });
}

const list: RequestHandler = async (req, res) => {
  try {
    const user = req.user!;
    const { status, priority, assignee } = req.query as Record<string, string | undefined>;

    const page = clampInt(req.query.page, 1, 1, 100_000);
    const limit = clampInt(req.query.limit, 20, 1, 100);

    const filter: Record<string, unknown> = {};
    if (status && STATUSES.has(status as TicketStatus)) filter.status = status;
    if (priority && PRIORITIES.has(priority as TicketPriority)) filter.priority = priority;
    if (assignee && isObjectId(assignee)) filter.assigneeId = assignee;

    // Operators only see their own tickets; managers/admins see all.
    if (user.role === "operator") filter.assigneeId = user._id;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate("clientId", "name company")
        .populate("assigneeId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Ticket.countDocuments(filter),
    ]);

    res.json({ tickets, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("tickets.list error:", (err as Error).message);
    fail(res, 500, "Не удалось получить заявки");
  }
};

const get: RequestHandler = async (req, res) => {
  try {
    const user = req.user!;
    if (!isObjectId(req.params.id)) {
      fail(res, 400, "Некорректный id заявки");
      return;
    }
    const ticket = await Ticket.findById(req.params.id)
      .populate("clientId")
      .populate("assigneeId", "name email role")
      .populate("createdBy", "name");
    if (!ticket) {
      fail(res, 404, "Заявка не найдена");
      return;
    }

    // Operators may only read tickets assigned to them or that they created.
    if (user.role === "operator") {
      const isAssignee = ticket.assigneeId && String(ticket.assigneeId) === String(user._id);
      const isCreator = ticket.createdBy && String(ticket.createdBy) === String(user._id);
      if (!isAssignee && !isCreator) {
        fail(res, 403, "Недостаточно прав", "FORBIDDEN");
        return;
      }
    }

    const history = await TicketHistory.find({ ticketId: ticket._id })
      .populate("performedBy", "name")
      .sort({ createdAt: 1 });
    res.json({ ticket, history });
  } catch (err) {
    console.error("tickets.get error:", (err as Error).message);
    fail(res, 500, "Не удалось получить заявку");
  }
};

const create: RequestHandler = async (req, res) => {
  try {
    const user = req.user!;
    const { title, description, clientId } = req.body as {
      title?: string;
      description?: string;
      clientId?: string;
    };
    if (!isNonEmptyString(title, 200) || !isNonEmptyString(description, 10_000) || !isObjectId(clientId)) {
      fail(res, 400, "Заполните все обязательные поля корректно");
      return;
    }

    const ticket = await Ticket.create({
      title: title.trim(),
      description: description.trim(),
      clientId,
      createdBy: user._id,
      status: "new",
    });

    await TicketHistory.create({
      ticketId: ticket._id,
      action: "created",
      newValue: "new",
      performedBy: user._id,
      comment: `Заявка создана: ${title.trim()}`,
    });

    let aiResult: Awaited<ReturnType<typeof processNewTicket>> | null = null;
    try {
      aiResult = await processNewTicket(ticket._id);
    } catch (err) {
      console.error("ai.processNewTicket error:", (err as Error).message);
    }

    const populated = await Ticket.findById(ticket._id)
      .populate("clientId", "name company")
      .populate("assigneeId", "name");

    res.status(201).json({ ticket: populated, aiResult, aiFailed: aiResult === null });
  } catch (err) {
    console.error("tickets.create error:", (err as Error).message);
    fail(res, 500, "Не удалось создать заявку");
  }
};

const update: RequestHandler = async (req, res) => {
  try {
    const user = req.user!;
    if (!isObjectId(req.params.id)) {
      fail(res, 400, "Некорректный id заявки");
      return;
    }
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      fail(res, 404, "Заявка не найдена");
      return;
    }

    const { status, assigneeId, priority } = req.body as {
      status?: TicketStatus;
      assigneeId?: string;
      priority?: TicketPriority;
    };

    // Authorization: operators may only update their own tickets and may not reassign.
    if (user.role === "operator") {
      const isAssignee = ticket.assigneeId && String(ticket.assigneeId) === String(user._id);
      if (!isAssignee) {
        fail(res, 403, "Недостаточно прав", "FORBIDDEN");
        return;
      }
      if (assigneeId !== undefined && String(assigneeId) !== String(ticket.assigneeId ?? "")) {
        fail(res, 403, "Назначение заявок доступно только менеджеру", "FORBIDDEN_ASSIGN");
        return;
      }
      if (priority !== undefined && priority !== ticket.priority) {
        fail(res, 403, "Изменение приоритета доступно только менеджеру", "FORBIDDEN_PRIORITY");
        return;
      }
    }

    if (status !== undefined) {
      if (!STATUSES.has(status)) {
        fail(res, 400, "Некорректный статус");
        return;
      }
      if (status !== ticket.status) {
        await TicketHistory.create({
          ticketId: ticket._id,
          action: "status_changed",
          oldValue: ticket.status,
          newValue: status,
          performedBy: user._id,
        });
        ticket.status = status;
        if (status === "in_progress" && !ticket.firstResponseAt) ticket.firstResponseAt = new Date();
        if (status === "resolved") ticket.resolvedAt = new Date();
      }
    }

    if (assigneeId !== undefined && String(assigneeId) !== String(ticket.assigneeId ?? "")) {
      if (!isObjectId(assigneeId)) {
        fail(res, 400, "Некорректный assigneeId");
        return;
      }
      const newAssignee = await User.findById(assigneeId);
      if (!newAssignee || !newAssignee.isActive || newAssignee.role !== "operator") {
        fail(res, 400, "Получатель должен быть активным оператором");
        return;
      }
      const previousAssigneeId = ticket.assigneeId ?? null;
      // Conditional update: only succeeds if assignee hasn't changed since we read it.
      // Prevents the load counter from drifting under concurrent reassignments.
      const claimed = await Ticket.findOneAndUpdate(
        { _id: ticket._id, assigneeId: previousAssigneeId },
        { $set: { assigneeId } },
        { new: false }
      );
      if (!claimed) {
        fail(res, 409, "Заявка была переназначена другим пользователем", "STALE_ASSIGNEE");
        return;
      }
      if (previousAssigneeId) {
        await User.findByIdAndUpdate(previousAssigneeId, { $inc: { currentLoad: -1 } });
      }
      await User.findByIdAndUpdate(assigneeId, { $inc: { currentLoad: 1 } });
      await TicketHistory.create({
        ticketId: ticket._id,
        action: "assigned",
        oldValue: previousAssigneeId ? String(previousAssigneeId) : undefined,
        newValue: assigneeId,
        performedBy: user._id,
      });
      ticket.set("assigneeId", assigneeId);
    }

    if (priority !== undefined && priority !== ticket.priority) {
      if (!PRIORITIES.has(priority)) {
        fail(res, 400, "Некорректный приоритет");
        return;
      }
      await TicketHistory.create({
        ticketId: ticket._id,
        action: "priority_changed",
        oldValue: ticket.priority,
        newValue: priority,
        performedBy: user._id,
      });
      ticket.priority = priority;
    }

    await ticket.save();

    const populated = await Ticket.findById(ticket._id)
      .populate("clientId", "name company")
      .populate("assigneeId", "name");
    res.json({ ticket: populated });
  } catch (err) {
    console.error("tickets.update error:", (err as Error).message);
    fail(res, 500, "Не удалось обновить заявку");
  }
};

/**
 * Authorise read-or-write access on a single ticket. Operators may only
 * touch tickets assigned to them or that they created. Admin/manager — any.
 */
async function loadTicketWithAuth(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) {
  if (!isObjectId(req.params.id)) {
    fail(res, 400, "Некорректный id заявки");
    return null;
  }
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    fail(res, 404, "Заявка не найдена");
    return null;
  }
  const user = req.user!;
  if (user.role === "operator") {
    const isAssignee = ticket.assigneeId && String(ticket.assigneeId) === String(user._id);
    const isCreator = ticket.createdBy && String(ticket.createdBy) === String(user._id);
    if (!isAssignee && !isCreator) {
      fail(res, 403, "Недостаточно прав", "FORBIDDEN");
      return null;
    }
  }
  return ticket;
}

const aiSuggestReply: RequestHandler = async (req, res) => {
  try {
    const ticket = await loadTicketWithAuth(req, res);
    if (!ticket) return;
    const suggestions = await suggestReplies(
      ticket.title,
      ticket.description,
      ticket.aiCategory ?? ticket.category
    );
    if (suggestions.length === 0) {
      fail(res, 502, "Не удалось получить варианты ответа", "AI_EMPTY");
      return;
    }
    res.json({ suggestions });
  } catch (err) {
    console.error("tickets.aiSuggestReply error:", (err as Error).message);
    fail(res, 502, "Сервис ИИ временно недоступен", "AI_FAILED");
  }
};

const aiSummarize: RequestHandler = async (req, res) => {
  try {
    const ticket = await loadTicketWithAuth(req, res);
    if (!ticket) return;
    const result = await summarizeTicket(ticket.title, ticket.description);
    if (!result.summary) {
      fail(res, 502, "Не удалось сформировать саммари", "AI_EMPTY");
      return;
    }
    res.json(result);
  } catch (err) {
    console.error("tickets.aiSummarize error:", (err as Error).message);
    fail(res, 502, "Сервис ИИ временно недоступен", "AI_FAILED");
  }
};

const aiSimilar: RequestHandler = async (req, res) => {
  try {
    const ticket = await loadTicketWithAuth(req, res);
    if (!ticket) return;
    const limit = clampInt(req.query.limit, 5, 1, 20);

    // Mongo $text + scoring; falls back to category-only if text index unused.
    const query = `${ticket.title} ${ticket.description}`.slice(0, 500);
    const filter: Record<string, unknown> = {
      _id: { $ne: ticket._id },
      $text: { $search: query },
    };
    if (ticket.aiCategory) filter.aiCategory = ticket.aiCategory;
    if (ticket.status === "resolved" || ticket.status === "closed") {
      // ok — looking for similar tickets regardless of state
    } else {
      filter.status = { $in: ["resolved", "closed"] };
    }

    let similar = await Ticket.find(filter, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .populate("clientId", "name company")
      .populate("assigneeId", "name");

    // Fallback: same category, most recent.
    if (similar.length === 0 && ticket.aiCategory) {
      similar = await Ticket.find({
        _id: { $ne: ticket._id },
        aiCategory: ticket.aiCategory,
        status: { $in: ["resolved", "closed"] },
      })
        .sort({ resolvedAt: -1, createdAt: -1 })
        .limit(limit)
        .populate("clientId", "name company")
        .populate("assigneeId", "name");
    }

    res.json({ similar });
  } catch (err) {
    console.error("tickets.aiSimilar error:", (err as Error).message);
    fail(res, 500, "Не удалось найти похожие заявки");
  }
};

router.get("/", auth, list);
router.get("/:id", auth, get);
router.post("/", auth, create);
router.put("/:id", auth, update);
router.patch("/:id", auth, update);

router.post("/:id/ai/suggest-reply", auth, aiSuggestReply);
router.post("/:id/ai/summarize", auth, aiSummarize);
router.get("/:id/ai/similar", auth, aiSimilar);

export default router;
