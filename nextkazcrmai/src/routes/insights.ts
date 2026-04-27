import { Router, type RequestHandler } from "express";
import { Ticket } from "../models/Ticket";
import { Client } from "../models/Client";
import { auth, requireRole } from "../middleware/auth";
import { generateDigest, type DigestStat } from "../lib/ai/insights";
import { clampInt } from "../lib/validate";

const router = Router();

const digest: RequestHandler = async (req, res) => {
  try {
    const hours = clampInt(req.query.hours, 24, 1, 24 * 30);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [totalTickets, newTickets, resolvedTickets, byCategoryRaw, byPriorityRaw, topClientsRaw, resolved] =
      await Promise.all([
        Ticket.countDocuments({ createdAt: { $gte: since } }),
        Ticket.countDocuments({ status: "new", createdAt: { $gte: since } }),
        Ticket.countDocuments({ resolvedAt: { $gte: since } }),
        Ticket.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: "$aiCategory", count: { $sum: 1 } } },
        ]),
        Ticket.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]),
        Ticket.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: "$clientId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
        Ticket.find({ resolvedAt: { $gte: since } }).select("createdAt resolvedAt"),
      ]);

    const byCategory: Record<string, number> = {};
    for (const r of byCategoryRaw) byCategory[String(r._id ?? "unknown")] = r.count;
    const byPriority: Record<string, number> = {};
    for (const r of byPriorityRaw) byPriority[String(r._id ?? "unknown")] = r.count;

    const topClientIds = topClientsRaw.map((r) => r._id).filter(Boolean);
    const clientDocs = topClientIds.length
      ? await Client.find({ _id: { $in: topClientIds } }).select("name company")
      : [];
    const clientById = new Map(clientDocs.map((c) => [String(c._id), c]));
    const topClients = topClientsRaw.map((r) => ({
      name: clientById.get(String(r._id))?.name ?? "Неизвестный клиент",
      count: r.count,
    }));

    const avgResolutionMins = resolved.length
      ? resolved.reduce(
          (sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt!.getTime()) / 60_000,
          0
        ) / resolved.length
      : 0;

    const stats: DigestStat = {
      totalTickets,
      newTickets,
      resolvedTickets,
      byCategory,
      byPriority,
      topClients,
      avgResolutionMins: Math.round(avgResolutionMins * 10) / 10,
      windowHours: hours,
    };

    let aiPart = { headline: "", insights: [] as string[], recommendations: [] as string[] };
    try {
      aiPart = await generateDigest(stats);
    } catch (err) {
      console.error("insights.digest AI failed:", (err as Error).message);
    }

    res.json({ ...stats, ...aiPart, aiAvailable: aiPart.headline.length > 0 });
  } catch (err) {
    console.error("insights.digest error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось сформировать дайджест" });
  }
};

router.get("/digest", auth, requireRole("admin", "manager"), digest);

export default router;
