import { env, isProd } from "./config/env";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth";
import ticketRoutes from "./routes/tickets";
import { clientRouter, userRouter } from "./routes/resources";
import analyticsRoutes from "./routes/analytics";
import insightsRoutes from "./routes/insights";
import aiChatRoutes from "./routes/aiChat";
import { apiLimiter } from "./middleware/rateLimit";
import { User } from "./models/User";
import { runSeed } from "./seed";

const app = express();

app.disable("x-powered-by");
app.use(helmet());

const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : null;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // mobile / curl / same-origin
      if (!allowedOrigins || allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS: origin not allowed"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

morgan.token("clean-body", (req: express.Request) => {
  if (!req.body || typeof req.body !== "object") return "";
  const redacted = { ...(req.body as Record<string, unknown>) };
  for (const key of ["password", "refreshToken", "token", "accessToken"]) {
    if (key in redacted) redacted[key] = "[REDACTED]";
  }
  return JSON.stringify(redacted);
});
app.use(morgan(isProd ? "combined" : "tiny"));

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/clients", clientRouter);
app.use("/api/users", userRouter);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/ai", aiChatRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    groq: env.GROQ_API_KEY ? "configured" : "missing",
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.json({ name: "nextkazcrmai", health: "/api/health" });
});

// 404 + error handlers (must be last)
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(((err, _req, res, _next) => {
  if (err && err.message === "CORS: origin not allowed") {
    res.status(403).json({ error: "CORS: origin not allowed" });
    return;
  }
  console.error("unhandled error:", err);
  res.status(500).json({ error: isProd ? "Внутренняя ошибка сервера" : (err as Error)?.message ?? "error" });
}) as express.ErrorRequestHandler);

async function resolveMongoUri(): Promise<string> {
  if (env.MONGODB_URI) return env.MONGODB_URI;
  console.log("MONGODB_URI not set — starting in-memory MongoDB (mongodb-memory-server)");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mem = await MongoMemoryServer.create();
  return mem.getUri();
}

async function bootstrap(): Promise<void> {
  const uri = await resolveMongoUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log("MongoDB connected");

  if (env.SEED_ON_BOOT || !env.MONGODB_URI) {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log("DB empty — auto-seeding demo data...");
      const stats = await runSeed();
      console.log(`Seeded ${stats.users} users, ${stats.clients} clients, ${stats.tickets} tickets`);
    }
  }
}

app.listen(env.PORT, () => console.log(`HTTP listening on ${env.PORT}`));

bootstrap().catch((err) => {
  console.error("Bootstrap failed:", (err as Error).message);
});
