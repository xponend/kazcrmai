import { Router, type RequestHandler } from "express";
import { Client } from "../models/Client";
import { User } from "../models/User";
import { auth, requireRole } from "../middleware/auth";
import { clampInt, escapeRegex, isObjectId, isNonEmptyString } from "../lib/validate";

export const clientRouter = Router();
export const userRouter = Router();

const listClients: RequestHandler = async (req, res) => {
  try {
    const { search } = req.query as { search?: string };
    const page = clampInt(req.query.page, 1, 1, 100_000);
    const limit = clampInt(req.query.limit, 50, 1, 200);

    const filter = search && isNonEmptyString(search, 200)
      ? (() => {
          const re = new RegExp(escapeRegex(search.trim()), "i");
          return { $or: [{ name: re }, { company: re }] };
        })()
      : {};

    const [clients, total] = await Promise.all([
      Client.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Client.countDocuments(filter),
    ]);
    res.json({ clients, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("clients.list error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось получить клиентов" });
  }
};

const getClient: RequestHandler = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      res.status(400).json({ error: "Некорректный id клиента" });
      return;
    }
    const client = await Client.findById(req.params.id);
    if (!client) {
      res.status(404).json({ error: "Клиент не найден" });
      return;
    }
    res.json({ client });
  } catch (err) {
    console.error("clients.get error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось получить клиента" });
  }
};

const createClient: RequestHandler = async (req, res) => {
  try {
    const { name, email, phone, company } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
    };
    if (!isNonEmptyString(name, 200)) {
      res.status(400).json({ error: "Имя клиента обязательно" });
      return;
    }
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Некорректный email" });
      return;
    }
    const client = await Client.create({
      name: name.trim(),
      ...(email && { email: email.trim().toLowerCase() }),
      ...(phone && { phone: String(phone).trim() }),
      ...(company && { company: String(company).trim() }),
    });
    res.status(201).json({ client });
  } catch (err) {
    console.error("clients.create error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось создать клиента" });
  }
};

clientRouter.get("/", auth, listClients);
clientRouter.get("/:id", auth, getClient);
clientRouter.post("/", auth, requireRole("admin", "manager"), createClient);

const listUsers: RequestHandler = async (_req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select("name email role skills currentLoad isActive")
      .sort({ name: 1 });
    res.json({ users });
  } catch (err) {
    console.error("users.list error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось получить пользователей" });
  }
};

const listOperators: RequestHandler = async (_req, res) => {
  try {
    const operators = await User.find({ role: "operator", isActive: true })
      .select("name skills currentLoad")
      .sort({ currentLoad: 1 });
    res.json({ operators });
  } catch (err) {
    console.error("users.operators error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось получить операторов" });
  }
};

userRouter.get("/", auth, requireRole("admin", "manager"), listUsers);
userRouter.get("/operators", auth, requireRole("admin", "manager"), listOperators);
