import { getGroq, GROQ_MODEL, withGroqTimeout, safeJsonParse } from "./groqClient";

export interface DigestStat {
  totalTickets: number;
  newTickets: number;
  resolvedTickets: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  topClients: Array<{ name: string; count: number }>;
  avgResolutionMins: number;
  windowHours: number;
}

export interface DigestResult extends DigestStat {
  headline: string;
  insights: string[];
  recommendations: string[];
}

const DIGEST_PROMPT = `Ты — ассистент руководителя CRM. По метрикам за указанный период напиши краткий обзор.

Требования:
- "headline": одно предложение ≤ 120 символов на русском, отражающее главное.
- "insights": 3-5 пунктов с конкретными цифрами и трендами (рост/падение, перекос по категориям, всплески).
- "recommendations": 2-4 практичных шага для команды (что делать дальше, кого усилить, какие категории требуют внимания).

Тон: деловой, без воды, без оценок типа "молодцы". Конкретика и цифры.

Ответ строго в формате JSON:
{ "headline": "...", "insights": ["..."], "recommendations": ["..."] }`;

export async function generateDigest(stats: DigestStat): Promise<Omit<DigestResult, keyof DigestStat>> {
  const response = await withGroqTimeout(
    getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: DIGEST_PROMPT },
        { role: "user", content: `Метрики за последние ${stats.windowHours}ч:\n${JSON.stringify(stats, null, 2)}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 600,
    })
  );

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse<{ headline?: string; insights?: string[]; recommendations?: string[] }>(raw, {});
  return {
    headline: typeof parsed.headline === "string" ? parsed.headline.slice(0, 200) : "",
    insights: Array.isArray(parsed.insights)
      ? parsed.insights.filter((s): s is string => typeof s === "string").slice(0, 5)
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.filter((s): s is string => typeof s === "string").slice(0, 4)
      : [],
  };
}

export interface ClientProfileInput {
  name: string;
  company?: string;
  totalTickets: number;
  avgSatisfaction: number;
  recentTickets: Array<{ title: string; category?: string; priority: string; status: string; createdAt?: Date }>;
}

export interface ClientProfile {
  persona: string;
  toneAdvice: string;
  riskFlags: string[];
  recurringTopics: string[];
}

const PROFILE_PROMPT = `Ты — аналитик CRM. По истории обращений клиента составь его рабочий портрет, чтобы оператор знал, как с ним общаться.

- "persona": 1-2 предложения, кто это и как обычно ведёт себя (например: "технически грамотный, требователен к срокам").
- "toneAdvice": одна строка, как операторам строить коммуникацию (формальный/неформальный, краткий/подробный).
- "riskFlags": 0-3 пункта рисков (частые жалобы, эскалации, долгие резолвинги, негативный сентимент). Если рисков нет — пустой массив.
- "recurringTopics": 1-4 темы, которые у этого клиента повторяются.

Тон: деловой. Никаких субъективных оценок личности.

Ответ строго в формате JSON:
{ "persona": "...", "toneAdvice": "...", "riskFlags": ["..."], "recurringTopics": ["..."] }`;

export async function generateClientProfile(input: ClientProfileInput): Promise<ClientProfile> {
  const response = await withGroqTimeout(
    getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: PROFILE_PROMPT },
        { role: "user", content: JSON.stringify(input, null, 2) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 500,
    })
  );

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse<Partial<ClientProfile>>(raw, {});
  return {
    persona: typeof parsed.persona === "string" ? parsed.persona.slice(0, 400) : "",
    toneAdvice: typeof parsed.toneAdvice === "string" ? parsed.toneAdvice.slice(0, 200) : "",
    riskFlags: Array.isArray(parsed.riskFlags)
      ? parsed.riskFlags.filter((s): s is string => typeof s === "string").slice(0, 3)
      : [],
    recurringTopics: Array.isArray(parsed.recurringTopics)
      ? parsed.recurringTopics.filter((s): s is string => typeof s === "string").slice(0, 4)
      : [],
  };
}
