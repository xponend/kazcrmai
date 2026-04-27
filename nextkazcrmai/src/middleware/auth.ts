import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { User, type Role } from "../models/User";

const SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

export const auth: RequestHandler = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "Токен не предоставлен" });
      return;
    }
    const decoded = jwt.verify(token, SECRET) as { id: string };
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Пользователь не найден" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Недействительный токен" });
  }
};

export const requireRole = (...roles: Role[]): RequestHandler => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ error: "Недостаточно прав" });
    return;
  }
  next();
};
