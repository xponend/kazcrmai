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
  byCategory: Array<{ category: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  windowDescription: string;
}

// Human Russian names so the assistant doesn't echo raw slugs to users.
const CATEGORY_RU: Record<string, string> = {
  technical_issue: "Технические проблемы",
  billing: "Оплата и счета",
  feature_request: "Запросы функций",
  complaint: "Жалобы",
  general_inquiry: "Общие вопросы",
  account_access: "Доступ к аккаунту",
  integration: "Интеграции",
  urgent_outage: "Срочные сбои",
};
const STATUS_RU: Record<string, string> = {
  new: "Новые",
  in_progress: "В работе",
  resolved: "Решённые",
  closed: "Закрытые",
};

const HISTORY_LIMIT = 10;
const RECENT_LIMIT = 40;
const MESSAGE_LIMIT = 2000;

export async function buildChatContext(user: UserDoc): Promise<ChatContext> {
  const filter: Record<string, unknown> = {};
  if (user.role === "operator") filter.assigneeId = user._id;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recent, total, open, critical, resolved24h, catAgg, statusAgg] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: -1 })
      .limit(RECENT_LIMIT)
      .select("_id title status priority category aiCategory createdAt resolvedAt"),
    Ticket.countDocuments(filter),
    Ticket.countDocuments({ ...filter, status: { $in: ["new", "in_progress"] } }),
    Ticket.countDocuments({ ...filter, priority: "critical", status: { $in: ["new", "in_progress"] } }),
    Ticket.countDocuments({ ...filter, resolvedAt: { $gte: since24h } }),
    Ticket.aggregate([
      { $match: filter },
      { $group: { _id: { $ifNull: ["$aiCategory", "$category"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Ticket.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    byCategory: catAgg
      .filter((c) => c._id)
      .map((c) => ({ category: String(c._id), count: c.count as number })),
    byStatus: statusAgg
      .filter((s) => s._id)
      .map((s) => ({ status: String(s._id), count: s.count as number })),
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

const SYSTEM_PROMPT = `Ты — ИИ-ассистент CRM-системы kazcrmai. Отвечай на русском, кратко и по делу.

Два типа вопросов:
1. Вопросы о ДАННЫХ системы (сколько заявок, какие категории, статусы, нагрузка, открытые/критические) — отвечай ТОЛЬКО по цифрам из блока "Контекст" ниже. Не выдумывай числа. Если конкретной цифры в контексте нет — так и скажи, что данных в выгрузке нет.
2. ОБЩИЕ вопросы (что такое backend, как приоритизируются заявки, объясни термин, посоветуй формулировку ответа клиенту и т.п.) — отвечай по существу из своих знаний, как грамотный помощник саппорта. Не отвечай "Нет данных" на общий вопрос — это не про данные.

Правила оформления:
- Категории и статусы называй по-русски (человеческими названиями из контекста), а не системными кодами вроде technical_issue.
- Когда спрашивают "какие категории чаще" — приведи топ категорий С ЧИСЛАМИ по убыванию.
- Список заявок оформляй компактно: статус · приоритет · заголовок.
- Не пересказывай весь контекст — отвечай на конкретный вопрос. Будь полезным, а не отказывайся.`;

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

  const categoryLines = context.byCategory.length
    ? context.byCategory
        .map((c) => `- ${CATEGORY_RU[c.category] ?? c.category}: ${c.count}`)
        .join("\n")
    : "- нет данных";
  const statusLines = context.byStatus.length
    ? context.byStatus
        .map((s) => `- ${STATUS_RU[s.status] ?? s.status}: ${s.count}`)
        .join("\n")
    : "- нет данных";

  const contextBlock = `Контекст (${context.windowDescription}):

Сводка:
- Всего заявок в скоупе: ${context.counts.total}
- Открытых: ${context.counts.open}
- Критических открытых: ${context.counts.critical}
- Решено за 24ч: ${context.counts.resolvedLast24h}

Заявки по категориям (по убыванию):
${categoryLines}

Заявки по статусам:
${statusLines}

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
