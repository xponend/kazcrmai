import { Ticket } from "../../models/Ticket";
import type { UserDoc } from "../../models/User";
import { getGroq, GROQ_MODEL, withGroqTimeout } from "./groqClient";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  recentTickets: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    category?: string;
    aiCategory?: string;
    createdAt?: Date;
    resolvedAt?: Date;
  }>;
  counts: {
    total: number;
    open: number;
    critical: number;
    resolvedLast24h: number;
  };
  windowDescription: string;
}

const HISTORY_LIMIT = 10;
const RECENT_LIMIT = 40;
const MESSAGE_LIMIT = 2000;

export async function buildChatContext(user: UserDoc): Promise<ChatContext> {
  const filter: Record<string, unknown> = {};
  if (user.role === "operator") filter.assigneeId = user._id;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recent, total, open, critical, resolved24h] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: -1 })
      .limit(RECENT_LIMIT)
      .select("_id title status priority category aiCategory createdAt resolvedAt"),
    Ticket.countDocuments(filter),
    Ticket.countDocuments({ ...filter, status: { $in: ["new", "in_progress"] } }),
    Ticket.countDocuments({ ...filter, priority: "critical", status: { $in: ["new", "in_progress"] } }),
    Ticket.countDocuments({ ...filter, resolvedAt: { $gte: since24h } }),
  ]);

  return {
    recentTickets: recent.map((t) => ({
      id: String(t._id),
      title: t.title,
      status: t.status,
      priority: t.priority,
      category: t.category,
      aiCategory: t.aiCategory,
      createdAt: t.createdAt,
      resolvedAt: t.resolvedAt,
    })),
    counts: { total, open, critical, resolvedLast24h: resolved24h },
    windowDescription:
      user.role === "operator" ? "только заявки текущего оператора" : "все заявки в системе",
  };
}

const SYSTEM_PROMPT = `Ты — помощник CRM-системы. Отвечай на русском, кратко и по делу. Используй ТОЛЬКО данные, которые приведены в системном сообщении ниже. Если данных недостаточно — честно скажи "Нет данных для ответа", не выдумывай.

Стиль:
- Не пересказывай весь контекст — отвечай на конкретный вопрос.
- Числа подкрепляй ссылкой ("из контекста: ..." не нужно — просто пиши факт).
- Если просят список заявок — оформи компактно: статус, приоритет, заголовок.
- Не давай советов вне CRM.`;

function clipMessage(s: string): string {
  return s.length > MESSAGE_LIMIT ? s.slice(0, MESSAGE_LIMIT) + "…" : s;
}

export async function chatWithContext(
  message: string,
  history: ChatTurn[],
  context: ChatContext
): Promise<string> {
  const trimmedHistory = history.slice(-HISTORY_LIMIT).map((h) => ({
    role: h.role,
    content: clipMessage(h.content),
  }));

  const contextBlock = `Контекст (${context.windowDescription}):

Сводка:
- Всего заявок в скоупе: ${context.counts.total}
- Открытых: ${context.counts.open}
- Критических открытых: ${context.counts.critical}
- Решено за 24ч: ${context.counts.resolvedLast24h}

Последние ${context.recentTickets.length} заявок (id | статус | приоритет | категория | заголовок):
${context.recentTickets
  .map(
    (t) =>
      `${t.id} | ${t.status} | ${t.priority} | ${t.aiCategory ?? t.category ?? "—"} | ${t.title.slice(0, 80)}`
  )
  .join("\n")}`;

  const response = await withGroqTimeout(
    getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: contextBlock },
        ...trimmedHistory,
        { role: "user", content: clipMessage(message) },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })
  );

  return response.choices[0]?.message?.content?.trim() ?? "";
}
