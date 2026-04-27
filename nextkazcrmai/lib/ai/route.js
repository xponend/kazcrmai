const { getGroq } = require("./groqClient");

async function routeTicket(category, priority, operators) {
  const operatorList = operators.map((op) => ({
    id: op._id.toString(),
    name: op.name,
    skills: op.skills,
    currentLoad: op.currentLoad,
  }));

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `Ты — агент маршрутизации заявок CRM-системы.
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
{ "assigneeId": "id_оператора", "assigneeName": "имя", "reasoning": "обоснование_выбора" }`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 200,
  });

  const result = JSON.parse(response.choices[0].message.content);

  // Validate assigneeId exists in operators
  const valid = operators.find((op) => op._id.toString() === result.assigneeId);
  if (!valid && operators.length > 0) {
    // Fallback: pick operator with lowest load matching skills
    const match =
      operators
        .filter((op) => op.skills.some((s) => category.includes(s)))
        .sort((a, b) => a.currentLoad - b.currentLoad)[0] ||
      operators.sort((a, b) => a.currentLoad - b.currentLoad)[0];

    result.assigneeId = match._id.toString();
    result.assigneeName = match.name;
    result.reasoning = "Автоматический выбор: минимальная нагрузка";
  }

  return result;
}

module.exports = { routeTicket };
