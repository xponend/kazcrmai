import { Router, type RequestHandler } from "express";
import { Client } from "../models/Client";
import { User } from "../models/User";
import { Ticket } from "../models/Ticket";
import { auth, requireRole } from "../middleware/auth";
import { generateClientProfile } from "../lib/ai/insights";
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

const aiProfile: RequestHandler = async (req, res) => {
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
    const recent = await Ticket.find({ clientId: client._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("title aiCategory category priority status createdAt");

    const profile = await generateClientProfile({
      name: client.name,
      company: client.company,
      totalTickets: client.totalTickets ?? 0,
      avgSatisfaction: client.avgSatisfaction ?? 3,
      recentTickets: recent.map((t) => ({
        title: t.title,
        category: t.aiCategory ?? t.category,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
      })),
    });
    res.json({ profile, sampleSize: recent.length });
  } catch (err) {
    console.error("clients.aiProfile error:", (err as Error).message);
    res.status(502).json({ error: "Сервис ИИ временно недоступен", code: "AI_FAILED" });
  }
};

clientRouter.get("/", auth, listClients);
clientRouter.get("/:id", auth, getClient);
clientRouter.post("/", auth, requireRole("admin", "manager"), createClient);
clientRouter.post("/:id/ai/profile", auth, requireRole("admin", "manager"), aiProfile);

// Roles that can be assigned a ticket as executor. Clients never appear here.
const STAFF_ROLES = ["operator", "manager", "admin"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];
const isStaffRole = (r: unknown): r is StaffRole =>
  typeof r === "string" && (STAFF_ROLES as readonly string[]).includes(r);
const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

const listUsers: RequestHandler = async (req, res) => {
  try {
    const { role } = req.query as { role?: string };
    const filter: Record<string, unknown> = { role: { $ne: "client" } };
    if (isStaffRole(role)) filter.role = role;
    const users = await User.find(filter)
      .select("name email role skills currentLoad isActive createdAt")
      .sort({ role: 1, name: 1 });
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

// All staff who can be manually assigned a ticket (operators + managers + admins).
const listAssignable: RequestHandler = async (_req, res) => {
  try {
    const assignable = await User.find({ role: { $in: STAFF_ROLES }, isActive: true })
      .select("name role skills currentLoad")
      .sort({ role: 1, currentLoad: 1 });
    res.json({ assignable });
  } catch (err) {
    console.error("users.assignable error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось получить исполнителей" });
  }
};

const createUser: RequestHandler = async (req, res) => {
  try {
    const { name, email, password, role, skills } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      skills?: unknown;
    };
    if (!isNonEmptyString(name, 200) || !email || !password) {
      res.status(400).json({ error: "Имя, email и пароль обязательны" });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Некорректный email" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Пароль должен быть не менее 8 символов" });
      return;
    }
    if (!isStaffRole(role)) {
      res.status(400).json({ error: "Роль должна быть operator, manager или admin" });
      return;
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      res.status(409).json({ error: "Пользователь с таким email уже существует" });
      return;
    }
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      skills: Array.isArray(skills) ? skills.filter((s) => typeof s === "string").slice(0, 20) : [],
    });
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, skills: user.skills, currentLoad: 0, isActive: true },
    });
  } catch (err) {
    console.error("users.create error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось создать пользователя" });
  }
};

const updateUser: RequestHandler = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      res.status(400).json({ error: "Некорректный id пользователя" });
      return;
    }
    const user = await User.findById(req.params.id);
    if (!user || user.role === "client") {
      res.status(404).json({ error: "Сотрудник не найден" });
      return;
    }
    const { name, role, skills, isActive } = req.body as {
      name?: string;
      role?: string;
      skills?: unknown;
      isActive?: boolean;
    };
    // Guard: an admin must not lock themselves out (demote/deactivate self).
    const isSelf = String(user._id) === String(req.user!._id);
    if (isSelf && ((role !== undefined && role !== "admin") || isActive === false)) {
      res.status(400).json({ error: "Нельзя понизить или отключить собственный аккаунт" });
      return;
    }
    let revoke = false;
    if (isNonEmptyString(name, 200)) user.name = name.trim();
    if (role !== undefined) {
      if (!isStaffRole(role)) {
        res.status(400).json({ error: "Роль должна быть operator, manager или admin" });
        return;
      }
      if (role !== user.role) revoke = true;
      user.role = role;
    }
    if (Array.isArray(skills)) {
      user.skills = skills.filter((s) => typeof s === "string").slice(0, 20);
    }
    if (typeof isActive === "boolean") {
      if (isActive === false && user.isActive) revoke = true;
      user.isActive = isActive;
    }
    if (revoke) user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, skills: user.skills, currentLoad: user.currentLoad, isActive: user.isActive },
    });
  } catch (err) {
    console.error("users.update error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось обновить пользователя" });
  }
};

const resetUserPassword: RequestHandler = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      res.status(400).json({ error: "Некорректный id пользователя" });
      return;
    }
    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: "Пароль должен быть не менее 8 символов" });
      return;
    }
    const user = await User.findById(req.params.id).select("+refreshTokens");
    if (!user || user.role === "client") {
      res.status(404).json({ error: "Сотрудник не найден" });
      return;
    }
    user.password = newPassword; // hashed by pre-save hook
    user.tokenVersion = (user.tokenVersion ?? 0) + 1; // revoke their sessions
    user.refreshTokens = [];
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("users.resetPassword error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось сбросить пароль" });
  }
};

userRouter.get("/", auth, requireRole("admin", "manager"), listUsers);
userRouter.get("/operators", auth, requireRole("admin", "manager"), listOperators);
userRouter.get("/assignable", auth, requireRole("admin", "manager"), listAssignable);
userRouter.post("/", auth, requireRole("admin"), createUser);
userRouter.patch("/:id", auth, requireRole("admin"), updateUser);
userRouter.post("/:id/password", auth, requireRole("admin"), resetUserPassword);
