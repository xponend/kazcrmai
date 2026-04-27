import { getGroq, GROQ_MODEL, withGroqTimeout, safeJsonParse } from "./groqClient";

export interface ReplySuggestion {
  tone: "neutral" | "apologetic" | "actionable";
  body: string;
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
}

const SUGGEST_PROMPT = `Ты — помощник оператора CRM, который пишет ответы клиентам на русском языке.
По тексту обращения сгенерируй ровно 3 разных варианта ответа клиенту:
- "neutral": нейтрально-информативный, объясняющий следующие шаги
- "apologetic": извиняющийся, признающий неудобства, для жалоб/сбоев
- "actionable": конкретные шаги/инструкции, что клиенту сделать

Каждый ответ — 2-4 предложения, без воды, без повторения текста клиента дословно.

Ответ строго в формате JSON:
{ "suggestions": [
  { "tone": "neutral", "body": "..." },
  { "tone": "apologetic", "body": "..." },
  { "tone": "actionable", "body": "..." }
] }`;

export async function suggestReplies(
  title: string,
  description: string,
  category?: string
): Promise<ReplySuggestion[]> {
  const userPrompt = `Категория: ${category ?? "не определена"}\nТема: ${title}\nОбращение:\n${description}`;
  const response = await withGroqTimeout(
    getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: SUGGEST_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 600,
    })
  );

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse<{ suggestions?: Array<Partial<ReplySuggestion>> }>(raw, {});
  const allowedTones = new Set(["neutral", "apologetic", "actionable"]);
  return (parsed.suggestions ?? [])
    .filter((s): s is ReplySuggestion =>
      typeof s?.body === "string" && s.body.trim().length > 0 && allowedTones.has(s.tone as string)
    )
    .slice(0, 3);
}

const SUMMARY_PROMPT = `Ты — аналитик CRM. По обращению клиента составь:
1. "summary" — одна строка ≤ 140 символов на русском, описывающая суть проблемы и желаемый результат.
2. "keyPoints" — массив из 3-5 пунктов с конкретными фактами/деталями (продукт, ошибка, время, сумма и т.п.).

Без воды, без оценок, только факты. Ответ строго в формате JSON:
{ "summary": "...", "keyPoints": ["...", "..."] }`;

export async function summarizeTicket(title: string, description: string): Promise<SummaryResult> {
  const response = await withGroqTimeout(
    getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: SUMMARY_PROMPT },
        { role: "user", content: `${title}\n${description}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 400,
    })
  );

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse<Partial<SummaryResult>>(raw, {});
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 200) : "";
  const keyPoints = Array.isArray(parsed.keyPoints)
    ? parsed.keyPoints
        .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
        .slice(0, 5)
    : [];
  return { summary, keyPoints };
}
