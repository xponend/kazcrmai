import { Router, type RequestHandler } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { User, type UserDoc } from "../models/User";
import { Client } from "../models/Client";
import { auth } from "../middleware/auth";
import { env } from "../config/env";
import { loginLimiter } from "../middleware/rateLimit";
import { escapeRegex } from "../lib/validate";

const ACCESS_TTL: SignOptions["expiresIn"] = env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"];
const REFRESH_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const MAX_ACTIVE_REFRESH_TOKENS = 5;

const router = Router();

function publicUser(u: UserDoc) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    ...(u.clientId ? { clientId: String(u.clientId) } : {}),
  };
}

function signAccessToken(u: UserDoc): string {
  return jwt.sign({ id: String(u._id), tv: u.tokenVersion }, env.JWT_SECRET, {
    expiresIn: ACCESS_TTL,
  });
}

function generateRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = crypto.randomBytes(48).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) };
}

async function issueRefreshToken(user: UserDoc): Promise<string> {
  const { raw, hash, expiresAt } = generateRefreshToken();
  const now = Date.now();
  const surviving = (user.refreshTokens ?? []).filter((t) => t.expiresAt.getTime() > now);
  surviving.push({ tokenHash: hash, expiresAt, createdAt: new Date() });
  user.refreshTokens = surviving.slice(-MAX_ACTIVE_REFRESH_TOKENS);
  await user.save();
  return raw;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Public self-registration — for CLIENT company workers using the landing
 * portal. Always creates a `client` role tied to their company (a Client doc,
 * found-or-created by company name). Staff accounts (operator/manager/admin)
 * are NEVER created here — those go through the admin-only POST /api/users.
 */
const register: RequestHandler = async (req, res) => {
  try {
    const { name, email, password, company, phone } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      company?: string;
      phone?: string;
    };
    if (!name || !email || !password || !company) {
      res.status(400).json({ error: "Имя, email, пароль и компания обязательны" });
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

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      res.status(409).json({ error: "Пользователь с таким email уже существует" });
      return;
    }

    // Find-or-create the company record this client belongs to.
    const companyName = company.trim();
    let client = await Client.findOne({
      company: new RegExp(`^${escapeRegex(companyName)}$`, "i"),
    });
    if (!client) {
      client = await Client.create({
        name: companyName,
        company: companyName,
        ...(email && { email: email.toLowerCase().trim() }),
        ...(phone && { phone: String(phone).trim() }),
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: "client",
      clientId: client._id,
    });
    // Reload with refreshTokens field selected so issueRefreshToken can persist.
    const userWithRefresh = await User.findById(user._id).select("+refreshTokens");
    if (!userWithRefresh) throw new Error("Failed to load created user");

    const accessToken = signAccessToken(userWithRefresh);
    const refreshToken = await issueRefreshToken(userWithRefresh);
    res.status(201).json({ accessToken, refreshToken, user: publicUser(userWithRefresh) });
  } catch (err) {
    console.error("register error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось создать пользователя" });
  }
};

/** Authenticated self-service password change. Keeps the current session
 *  alive (issues fresh tokens) but revokes all OTHER devices. */
const changePassword: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: "Не авторизовано" });
      return;
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Текущий и новый пароль обязательны" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "Новый пароль должен быть не менее 8 символов" });
      return;
    }

    const user = await User.findById(userId).select("+password +refreshTokens");
    if (!user) {
      res.status(401).json({ error: "Пользователь не найден" });
      return;
    }
    if (!(await user.comparePassword(currentPassword))) {
      res.status(400).json({ error: "Текущий пароль неверен", code: "BAD_PASSWORD" });
      return;
    }

    user.password = newPassword; // pre-save hook hashes it
    user.tokenVersion = (user.tokenVersion ?? 0) + 1; // revoke old access tokens
    user.refreshTokens = []; // drop all refresh sessions, then re-issue current
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user);
    res.json({ accessToken, refreshToken, user: publicUser(user) });
  } catch (err) {
    console.error("changePassword error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось изменить пароль" });
  }
};

const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email и пароль обязательны" });
      return;
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password +refreshTokens");
    if (!user || !user.isActive || !(await user.comparePassword(password))) {
      res.status(401).json({ error: "Неверный email или пароль" });
      return;
    }
    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user);
    res.json({ accessToken, refreshToken, user: publicUser(user) });
  } catch (err) {
    console.error("login error:", (err as Error).message);
    res.status(500).json({ error: "Ошибка входа" });
  }
};

/** Self-service profile update — change display name and/or login email. */
const updateProfile: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: "Не авторизовано" });
      return;
    }
    const { name, email } = req.body as { name?: string; email?: string };
    if (name === undefined && email === undefined) {
      res.status(400).json({ error: "Нечего обновлять" });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(401).json({ error: "Пользователь не найден" });
      return;
    }
    if (typeof name === "string") {
      if (name.trim().length === 0) {
        res.status(400).json({ error: "Имя не может быть пустым" });
        return;
      }
      user.name = name.trim();
    }
    if (typeof email === "string") {
      const next = email.toLowerCase().trim();
      if (!isValidEmail(next)) {
        res.status(400).json({ error: "Некорректный email" });
        return;
      }
      if (next !== user.email) {
        const taken = await User.findOne({ email: next, _id: { $ne: user._id } });
        if (taken) {
          res.status(409).json({ error: "Этот email уже занят", code: "EMAIL_TAKEN" });
          return;
        }
        user.email = next;
      }
    }
    await user.save();
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("updateProfile error:", (err as Error).message);
    res.status(500).json({ error: "Не удалось обновить профиль" });
  }
};

const refresh: RequestHandler = async (req, res) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ error: "refreshToken обязателен" });
      return;
    }
    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const user = await User.findOne({ "refreshTokens.tokenHash": hash }).select("+refreshTokens");
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Сессия не найдена", code: "REFRESH_INVALID" });
      return;
    }
    const entry = user.refreshTokens.find((t) => t.tokenHash === hash);
    if (!entry || entry.expiresAt.getTime() <= Date.now()) {
      // Token is expired or missing — drop it and reject.
      user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== hash);
      await user.save();
      res.status(401).json({ error: "Сессия истекла", code: "REFRESH_EXPIRED" });
      return;
    }
    // Rotate: replace this entry with a fresh one.
    user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== hash);
    const newRefresh = await issueRefreshToken(user);
    const accessToken = signAccessToken(user);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    console.error("refresh error:", (err as Error).message);
    res.status(500).json({ error: "Ошибка обновления сессии" });
  }
};

const logout: RequestHandler = async (req, res) => {
  try {
    const { refreshToken, allDevices } = req.body as {
      refreshToken?: string;
      allDevices?: boolean;
    };
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: "Не авторизовано" });
      return;
    }
    const user = await User.findById(userId).select("+refreshTokens");
    if (!user) {
      res.status(401).json({ error: "Пользователь не найден" });
      return;
    }

    if (allDevices) {
      user.refreshTokens = [];
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    } else if (refreshToken) {
      const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== hash);
    } else {
      user.refreshTokens = [];
    }
    await user.save();
    res.status(204).end();
  } catch (err) {
    console.error("logout error:", (err as Error).message);
    res.status(500).json({ error: "Ошибка выхода" });
  }
};

const me: RequestHandler = (req, res) => {
  const u = req.user;
  if (!u) {
    res.status(401).json({ error: "Не авторизовано" });
    return;
  }
  res.json({ user: publicUser(u) });
};

router.post("/register", loginLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", auth, logout);
router.post("/change-password", auth, changePassword);
router.patch("/profile", auth, updateProfile);
router.get("/me", auth, me);

export default router;
