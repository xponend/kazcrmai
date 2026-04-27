const { getGroq } = require("./groqClient");

const CATEGORIES = [
  "technical_issue",
  "billing",
  "feature_request",
  "complaint",
  "general_inquiry",
  "account_access",
  "integration",
  "urgent_outage",
];

async function classifyTicket(title, description) {
  const text = `${title}\n${description}`;

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `Ты — интеллектуальный классификатор заявок CRM-системы.
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
{ "category": "название_категории", "confidence": число_от_0_до_1, "reasoning": "краткое_обоснование_на_русском" }`,
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 200,
  });

  const result = JSON.parse(response.choices[0].message.content);

  if (!CATEGORIES.includes(result.category)) {
    result.category = "general_inquiry";
    result.confidence = 0.5;
  }

  return result;
}

module.exports = { classifyTicket, CATEGORIES };
