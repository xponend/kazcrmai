import { getGroq, GROQ_MODEL } from "./groqClient";

export const CATEGORIES = [
  "technical_issue",
  "billing",
  "feature_request",
  "complaint",
  "general_inquiry",
  "account_access",
  "integration",
  "urgent_outage",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Classification {
  category: Category;
  confidence: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `Ты — интеллектуальный классификатор заявок CRM-системы.
Проанализируй текст обращения клиента и определи его категорию.

Допустимые категории:
- technical_issue: технические проблемы, ошибки, сбои в работе ПО
- billing: вопросы оплаты, счетов, возвратов, тарифов
- feature_request: запрос новой функциональности или улучшений
- complaint: жалоба на качество обслуживания или продукта
- general_inquiry: общий вопрос, консультация, информация
- account_access: проблемы с доступом, паролем, авторизацией
- integration: вопросы интеграции с другими системами (1С, API и т.д.)
- urgent_outage: срочный сбой, потеря данных, неработоспособность системы

Ответ строго в формате JSON:
{ "category": "название_категории", "confidence": число_от_0_до_1, "reasoning": "краткое_обоснование_на_русском" }`;

export async function classifyTicket(title: string, description: string): Promise<Classification> {
  const response = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${title}\n${description}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 200,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<Classification>;
  const category = (CATEGORIES as readonly string[]).includes(parsed.category as string)
    ? (parsed.category as Category)
    : "general_inquiry";
  return {
    category,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    reasoning: parsed.reasoning ?? "",
  };
}
