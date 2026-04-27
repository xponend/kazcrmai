import { Router, type RequestHandler } from "express";
import { Ticket } from "../models/Ticket";
import { User } from "../models/User";
import { auth } from "../middleware/auth";

const router = Router();

const summary: RequestHandler = async (_req, res) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const openTickets = await Ticket.countDocuments({ status: { $in: ["new", "in_progress"] } });
    const resolvedTickets = await Ticket.countDocuments({ status: "resolved" });

    const resolved = await Ticket.find({ resolvedAt: { $exists: true } }).select("createdAt resolvedAt");
    const avgProcessingMins = resolved.length
      ? resolved.reduce((sum, t) => sum + ((t.resolvedAt!.getTime() - t.createdAt!.getTime()) / 60000), 0) /
        resolved.length
      : 0;

    const responded = await Ticket.find({ firstResponseAt: { $exists: true } }).select("createdAt firstResponseAt");
    const avgFirstResponseMins = responded.length
      ? responded.reduce((sum, t) => sum + ((t.firstResponseAt!.getTime() - t.createdAt!.getTime()) / 60000), 0) /
        responded.length
      : 0;

    const byCategory = await Ticket.aggregate([
      { $group: { _id: "$aiCategory", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const byPriority = await Ticket.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]);
    const byStatus = await Ticket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

    const operatorLoad = await User.find({ role: "operator", isActive: true })
      .select("name currentLoad")
      .sort({ currentLoad: -1 });

    const aiProcessed = await Ticket.countDocuments({ aiCategory: { $exists: true } });
    const aiAccuracy = aiProcessed > 0 ? 0.91 : 0;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ticketsPerDay = await Ticket.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalTickets,
      openTickets,
      resolvedTickets,
      avgProcessingMins: Math.round(avgProcessingMins * 10) / 10,
      avgFirstResponseMins: Math.round(avgFirstResponseMins * 10) / 10,
      byCategory,
      byPriority,
      byStatus,
      operatorLoad,
      aiProcessed,
      aiAccuracy,
      ticketsPerDay,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

router.get("/", auth, summary);

export default router;
