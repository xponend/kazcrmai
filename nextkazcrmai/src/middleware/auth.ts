import type { RequestHandler } from "express";
import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import { User, type Role } from "../models/User";
import { env } from "../config/env";

export interface AccessTokenPayload {
  id: string;
  tv: number;
}

export const auth: RequestHandler = async (req, res, next) => {
  try {
    const header = req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      res.status(401).json({ error: "Токен не предоставлен", code: "NO_TOKEN" });
      return;
    }

    let decoded: AccessTokenPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        res.status(401).json({ error: "Токен истёк", code: "TOKEN_EXPIRED" });
        return;
      }
      if (err instanceof JsonWebTokenError) {
        res.status(401).json({ error: "Недействительный токен", code: "TOKEN_INVALID" });
        return;
      }
      throw err;
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Пользователь не найден", code: "USER_INACTIVE" });
      return;
    }
    if (typeof decoded.tv !== "number" || decoded.tv !== user.tokenVersion) {
      res.status(401).json({ error: "Сессия отозвана", code: "SESSION_REVOKED" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Недействительный токен", code: "TOKEN_INVALID" });
  }
};

export const requireRole = (...roles: Role[]): RequestHandler => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ error: "Недостаточно прав", code: "FORBIDDEN" });
    return;
  }
  next();
};
