import { Types } from "mongoose";
import { Client } from "../../models/Client";
import { Ticket } from "../../models/Ticket";
import { TicketHistory } from "../../models/TicketHistory";
import { User } from "../../models/User";
import { classifyTicket, type Classification } from "./classify";
import { prioritizeTicket, type PriorityResult } from "./prioritize";
import { routeTicket, type RoutingResult } from "./route";

export interface AiPipelineResult {
  classification: Classification;
  priority: PriorityResult;
  routing: RoutingResult;
  processingTimeMs: number;
}

export async function processNewTicket(ticketId: Types.ObjectId | string): Promise<AiPipelineResult> {
  const startTime = Date.now();

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error("Ticket not found");

  const client = await Client.findById(ticket.clientId);
  const clientHistory = {
    totalTickets: client?.totalTickets ?? 0,
    avgSatisfaction: client?.avgSatisfaction ?? 3,
  };

  const classification = await classifyTicket(ticket.title, ticket.description);
  const priority = await prioritizeTicket(
    ticket.title,
    ticket.description,
    classification.category,
    clientHistory
  );

  const operators = await User.find({ role: "operator", isActive: true });
  const routing = await routeTicket(classification.category, priority.priority, operators);

  const processingTimeMs = Date.now() - startTime;

  await Ticket.findByIdAndUpdate(ticketId, {
    aiCategory: classification.category,
    aiConfidence: classification.confidence,
    aiScore: priority.score,
    priority: priority.priority,
    category: classification.category,
    assigneeId: new Types.ObjectId(routing.assigneeId),
    aiReason: `Категория: ${classification.reasoning} | Приоритет: ${priority.reasoning} | Назначен: ${routing.reasoning}`,
    aiProcessedAt: new Date(),
  });

  await User.findByIdAndUpdate(routing.assigneeId, { $inc: { currentLoad: 1 } });
  if (ticket.clientId) {
    await Client.findByIdAndUpdate(ticket.clientId, { $inc: { totalTickets: 1 } });
  }

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
      processingTimeMs,
    }),
    comment: `ИИ-анализ завершён за ${processingTimeMs}мс. Категория: ${classification.category} (${Math.round(classification.confidence * 100)}%). Приоритет: ${priority.priority} (${priority.score}/100). Назначен: ${routing.assigneeName}.`,
  });

  return { classification, priority, routing, processingTimeMs };
}
