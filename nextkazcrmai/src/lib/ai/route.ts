import type { TicketPriority } from "../../models/Ticket";
import type { UserDoc } from "../../models/User";
import type { Category } from "./classify";
import { getGroq, GROQ_MODEL, withGroqTimeout, safeJsonParse } from "./groqClient";

export interface RoutingResult {
  assigneeId: string;
  assigneeName: string;
  reasoning: string;
}

export async function routeTicket(
  category: Category,
  priority: TicketPriority,
  operators: UserDoc[]
): Promise<RoutingResult> {
  if (operators.length === 0) {
    throw new Error("No operators available for routing");
  }

  const operatorList = operators.map((op) => ({
    id: String(op._id),
    name: op.name,
    skills: op.skills,
    currentLoad: op.currentLoad,
  }));

  const system = `Ты — агент маршрутизации заявок CRM-системы.
Определи оптимального исполнителя для заявки.

Критерии выбора (в порядке приоритета):
1. Компетенция — навыки оператора должны соответствовать категории заявки
2. Нагрузка — предпочтение операторам с меньшим количеством открытых заявок
3. Для критических заявок — назначай наиболее компетентного, независимо от нагрузки

Категория заявки: ${category}
Приоритет: ${priority}

Доступные операторы:
${JSON.stringify(operatorList, null, 2)}

Ответ строго в формате JSON:
{ "assigneeId": "id_оператора", "assigneeName": "имя", "reasoning": "обоснование_выбора" }`;

  let parsed: Partial<RoutingResult> = {};
  try {
    const response = await withGroqTimeout(
      getGroq().chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: system }],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 200,
      })
    );
    const raw = response.choices[0]?.message?.content ?? "{}";
    parsed = safeJsonParse<Partial<RoutingResult>>(raw, {});
  } catch (err) {
    console.error("routeTicket: Groq call failed, falling back:", (err as Error).message);
  }

  const valid = operators.find((op) => String(op._id) === parsed.assigneeId);
  if (valid) {
    return {
      assigneeId: String(valid._id),
      assigneeName: valid.name,
      reasoning: parsed.reasoning ?? "",
    };
  }

  // Fallback: skill match (exact, not substring) + lowest load
  const skillMatch = operators
    .filter((op) => op.skills.includes(category))
    .sort((a, b) => a.currentLoad - b.currentLoad);
  const fallback = skillMatch[0] ?? [...operators].sort((a, b) => a.currentLoad - b.currentLoad)[0]!;
  return {
    assigneeId: String(fallback._id),
    assigneeName: fallback.name,
    reasoning: "Автоматический выбор: минимальная нагрузка",
  };
}
