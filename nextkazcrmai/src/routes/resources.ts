import { Router, type RequestHandler } from "express";
import { Client } from "../models/Client";
import { User } from "../models/User";
import { auth } from "../middleware/auth";

export const clientRouter = Router();
export const userRouter = Router();

const listClients: RequestHandler = async (req, res) => {
  try {
    const { search } = req.query as { search?: string };
    const filter = search
      ? { $or: [{ name: new RegExp(search, "i") }, { company: new RegExp(search, "i") }] }
      : {};
    const clients = await Client.find(filter).sort({ name: 1 });
    res.json({ clients });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

const getClient: RequestHandler = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      res.status(404).json({ error: "Клиент не найден" });
      return;
    }
    res.json({ client });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

const createClient: RequestHandler = async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json({ client });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

clientRouter.get("/", auth, listClients);
clientRouter.get("/:id", auth, getClient);
clientRouter.post("/", auth, createClient);

const listUsers: RequestHandler = async (_req, res) => {
  try {
    const users = await User.find({ isActive: true }).select("-password").sort({ name: 1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

const listOperators: RequestHandler = async (_req, res) => {
  try {
    const operators = await User.find({ role: "operator", isActive: true })
      .select("name skills currentLoad")
      .sort({ currentLoad: 1 });
    res.json({ operators });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

userRouter.get("/", auth, listUsers);
userRouter.get("/operators", auth, listOperators);
