const { getGroq } = require("./groqClient");

async function prioritizeTicket(title, description, category, clientHistory) {
  const text = `${title}\n${description}`;

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `Ты — агент приоритизации заявок CRM-системы.
Оцени срочность обращения клиента по шкале от 0 до 100.

Факторы оценки:
1. Тональность текста (негативная/критическая повышает приоритет)
2. Ключевые слова срочности: "срочно", "авария", "потеря данных", "не работает", "критично", "блокирует работу"
3. Категория заявки: urgent_outage и complaint → выше приоритет
4. История клиента: ${clientHistory.totalTickets} предыдущих заявок, средняя оценка удовлетворённости: ${clientHistory.avgSatisfaction}/5

Шкала приоритетов:
- 0-25: low (низкий) — общие вопросы, не требующие срочного ответа
- 26-50: medium (средний) — стандартные запросы
- 51-75: high (высокий) — проблемы, влияющие на работу
- 76-100: critical (критический) — срочные сбои, потеря данных, блокировка бизнес-процессов

Категория заявки: ${category}

Ответ строго в формате JSON:
{ "score": число_0_100, "priority": "low|medium|high|critical", "sentiment": "neutral|negative|critical", "reasoning": "краткое_обоснование" }`,
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 200,
  });

  const result = JSON.parse(response.choices[0].message.content);

  // Enforce score-priority consistency
  if (result.score >= 76) result.priority = "critical";
  else if (result.score >= 51) result.priority = "high";
  else if (result.score >= 26) result.priority = "medium";
  else result.priority = "low";

  return result;
}

module.exports = { prioritizeTicket };
