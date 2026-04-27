const { classifyTicket } = require("./classify");
const { prioritizeTicket } = require("./prioritize");
const { routeTicket } = require("./route");
const Ticket = require("../../models/Ticket");
const TicketHistory = require("../../models/TicketHistory");
const User = require("../../models/User");
const Client = require("../../models/Client");

async function processNewTicket(ticketId) {
  const startTime = Date.now();

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error("Ticket not found");

  // Get client history for context
  const client = await Client.findById(ticket.clientId);
  const clientHistory = {
    totalTickets: client?.totalTickets || 0,
    avgSatisfaction: client?.avgSatisfaction || 3,
  };

  // Agent 1: Classification
  const classification = await classifyTicket(ticket.title, ticket.description);

  // Agent 2: Prioritization (uses classification result as context)
  const priority = await prioritizeTicket(
    ticket.title,
    ticket.description,
    classification.category,
    clientHistory
  );

  // Agent 3: Routing (uses both classification and priority)
  const operators = await User.find({ role: "operator", isActive: true });
  const routing = await routeTicket(classification.category, priority.priority, operators);

  // Update ticket with AI results
  const processingTime = Date.now() - startTime;

  await Ticket.findByIdAndUpdate(ticketId, {
    aiCategory: classification.category,
    aiConfidence: classification.confidence,
    aiScore: priority.score,
    priority: priority.priority,
    category: classification.category,
    assigneeId: routing.assigneeId,
    aiReason: `Категория: ${classification.reasoning} | Приоритет: ${priority.reasoning} | Назначен: ${routing.reasoning}`,
    aiProcessedAt: new Date(),
  });

  // Increment operator load
  await User.findByIdAndUpdate(routing.assigneeId, { $inc: { currentLoad: 1 } });

  // Increment client ticket count
  await Client.findByIdAndUpdate(ticket.clientId, { $inc: { totalTickets: 1 } });

  // Log AI decision to history
  await TicketHistory.create({
    ticketId,
    action: "ai_processed",
    newValue: JSON.stringify({
      category: classification.category,
      confidence: classification.confidence,
      priority: priority.priority,
      score: priority.score,
      sentiment: priority.sentiment,
      assignee: routing.assigneeName,
      processingTimeMs: processingTime,
    }),
    comment: `ИИ-анализ завершён за ${processingTime}мс. Категория: ${classification.category} (${Math.round(classification.confidence * 100)}%). Приоритет: ${priority.priority} (${priority.score}/100). Назначен: ${routing.assigneeName}.`,
  });

  return {
    classification,
    priority,
    routing,
    processingTimeMs: processingTime,
  };
}

module.exports = { processNewTicket };
