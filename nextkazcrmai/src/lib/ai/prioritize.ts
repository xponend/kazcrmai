import type { TicketPriority } from "../../models/Ticket";
import type { Category } from "./classify";
import { getGroq, GROQ_MODEL } from "./groqClient";

export interface ClientHistory {
  totalTickets: number;
  avgSatisfaction: number;
}

export interface PriorityResult {
  score: number;
  priority: TicketPriority;
  sentiment: "neutral" | "negative" | "critical";
  reasoning: string;
}

function priorityFromScore(score: number): TicketPriority {
  if (score >= 76) return "critical";
  if (score >= 51) return "high";
  if (score >= 26) return "medium";
  return "low";
}

export async function prioritizeTicket(
  title: string,
  description: string,
  category: Category,
  clientHistory: ClientHistory
): Promise<PriorityResult> {
  const system = `Ты — агент приоритизации заявок CRM-системы.
Оцени срочность обращения клиента по шкале от 0 до 100.

Факторы оценки:
1. Тональность текста (негативная/критическая повышает приоритет)
2. Ключевые слова срочности: "срочно", "авария", "потеря данных", "не работает", "критично", "блокирует работу"
3. Категория заявки: urgent_outage и complaint → выше приоритет
4. История клиента: ${clientHistory.totalTickets} предыдущих заявок, средняя оценка удовлетворённости: ${clientHistory.avgSatisfaction}/5

Шкала приоритетов:
- 0-25: low (низкий)
- 26-50: medium (средний)
- 51-75: high (высокий)
- 76-100: critical (критический)

Категория заявки: ${category}

Ответ строго в формате JSON:
{ "score": число_0_100, "priority": "low|medium|high|critical", "sentiment": "neutral|negative|critical", "reasoning": "краткое_обоснование" }`;

  const response = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `${title}\n${description}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 200,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<PriorityResult>;
  const score = typeof parsed.score === "number" ? Math.max(0, Math.min(100, parsed.score)) : 50;
  return {
    score,
    priority: priorityFromScore(score),
    sentiment: parsed.sentiment ?? "neutral",
    reasoning: parsed.reasoning ?? "",
  };
}
