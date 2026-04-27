import { Router, type RequestHandler } from "express";
import { auth } from "../middleware/auth";
import { buildChatContext, chatWithContext, type ChatTurn } from "../lib/ai/chat";
import { isNonEmptyString } from "../lib/validate";
import rateLimit from "express-rate-limit";

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Слишком частые запросы к ассистенту. Подождите минуту." },
});

const VALID_ROLES = new Set(["user", "assistant"]);

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (h): h is ChatTurn =>
        h !== null &&
        typeof h === "object" &&
        VALID_ROLES.has((h as ChatTurn).role) &&
        typeof (h as ChatTurn).content === "string"
    )
    .map((h) => ({ role: h.role, content: h.content }));
}

const chat: RequestHandler = async (req, res) => {
  try {
    const user = req.user!;
    const { message, history } = req.body as { message?: string; history?: unknown };
    if (!isNonEmptyString(message, 4000)) {
      res.status(400).json({ error: "Сообщение обязательно" });
      return;
    }

    const ctx = await buildChatContext(user);
    const reply = await chatWithContext(message.trim(), sanitizeHistory(history), ctx);
    if (!reply) {
      res.status(502).json({ error: "Сервис ИИ не вернул ответ", code: "AI_EMPTY" });
      return;
    }
    res.json({
      reply,
      contextStats: ctx.counts,
      contextSize: ctx.recentTickets.length,
    });
  } catch (err) {
    console.error("aiChat error:", (err as Error).message);
    res.status(502).json({ error: "Сервис ИИ временно недоступен", code: "AI_FAILED" });
  }
};

router.post("/chat", auth, chatLimiter, chat);

export default router;
