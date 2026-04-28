import { getGroq, GROQ_MODEL, withGroqTimeout, safeJsonParse } from "./groqClient";

export type TargetLang = "ru" | "kk" | "en";

const LANG_LABEL: Record<TargetLang, string> = {
  ru: "русский",
  kk: "казахский",
  en: "английский",
};

export interface TranslationResult {
  title: string;
  description: string;
  lang: TargetLang;
}

const TRANSLATE_PROMPT = (target: TargetLang) =>
  `Ты — переводчик. Переведи заголовок и описание заявки на ${LANG_LABEL[target]} язык.
Сохрани смысл, имена собственные, технические термины (например, API, 1С, Halyk Pay) — не переводи их.
Тон — официально-деловой.

Ответ строго в формате JSON:
{ "title": "...", "description": "..." }`;

export async function translateTicket(
  title: string,
  description: string,
  target: TargetLang
): Promise<TranslationResult> {
  const response = await withGroqTimeout(
    getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: TRANSLATE_PROMPT(target) },
        { role: "user", content: `Заголовок: ${title}\n\nОписание: ${description}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1500,
    })
  );
  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse<{ title?: string; description?: string }>(raw, {});
  return {
    title: typeof parsed.title === "string" ? parsed.title : title,
    description: typeof parsed.description === "string" ? parsed.description : description,
    lang: target,
  };
}


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

export interface PlaybookStep {
  index: number;
  action: string;
  detail: string;
}

export interface PlaybookResult {
  steps: PlaybookStep[];
  estimatedMinutes: number;
  escalateIf: string[];
}

const PLAYBOOK_PROMPT = `Ты — старший инженер техподдержки. По текущей заявке и нескольким похожим уже решённым составь план действий для оператора.

Требования:
- "steps": 4-6 пунктов. Каждый: "action" (короткая команда, повелительное наклонение, ≤ 70 символов) + "detail" (1-2 предложения с уточнением).
- Шаги конкретные: какие логи смотреть, какие команды запускать, что у клиента уточнить, в каком порядке.
- Опирайся на похожие резолвы (если есть в контексте). Не пиши общие фразы вроде "уточнить детали".
- "estimatedMinutes": реалистичная оценка в минутах для всего плана.
- "escalateIf": 1-3 чётких триггера, когда передавать заявку выше (например: "если логи показывают X").

Ответ строго в формате JSON:
{ "steps": [{"index":1,"action":"...","detail":"..."}], "estimatedMinutes": 30, "escalateIf": ["..."] }`;

export interface PlaybookInput {
  title: string;
  description: string;
  category?: string;
  priority: string;
  similarResolved: Array<{ title: string; resolutionNotes?: string; resolvedAtMins?: number }>;
}

export async function generatePlaybook(input: PlaybookInput): Promise<PlaybookResult> {
  const userPrompt = `Текущая заявка:
- Тема: ${input.title}
- Описание: ${input.description}
- Категория: ${input.category ?? "не определена"}
- Приоритет: ${input.priority}

Похожие уже решённые заявки (для опоры):
${
  input.similarResolved.length === 0
    ? "(нет в истории — составь план с нуля по категории)"
    : input.similarResolved
        .map(
          (s, i) =>
            `${i + 1}. ${s.title}${s.resolvedAtMins ? ` — закрыто за ${s.resolvedAtMins}мин` : ""}${
              s.resolutionNotes ? `\n   Заметки: ${s.resolutionNotes.slice(0, 250)}` : ""
            }`
        )
        .join("\n")
}`;

  const response = await withGroqTimeout(
    getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: PLAYBOOK_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 800,
    })
  );

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse<Partial<PlaybookResult>>(raw, {});
  const steps = Array.isArray(parsed.steps)
    ? parsed.steps
        .filter(
          (s): s is PlaybookStep =>
            s !== null &&
            typeof s === "object" &&
            typeof (s as PlaybookStep).action === "string" &&
            typeof (s as PlaybookStep).detail === "string"
        )
        .slice(0, 6)
        .map((s, i) => ({ index: i + 1, action: s.action, detail: s.detail }))
    : [];
  const estimatedMinutes =
    typeof parsed.estimatedMinutes === "number" && parsed.estimatedMinutes > 0
      ? Math.min(480, Math.round(parsed.estimatedMinutes))
      : 0;
  const escalateIf = Array.isArray(parsed.escalateIf)
    ? parsed.escalateIf.filter((s): s is string => typeof s === "string").slice(0, 3)
    : [];
  return { steps, estimatedMinutes, escalateIf };
}

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
