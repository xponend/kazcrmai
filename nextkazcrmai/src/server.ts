import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth";
import ticketRoutes from "./routes/tickets";
import { clientRouter, userRouter } from "./routes/resources";
import analyticsRoutes from "./routes/analytics";
import { User } from "./models/User";
import { runSeed } from "./seed";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/clients", clientRouter);
app.use("/api/users", userRouter);
app.use("/api/analytics", analyticsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    groq: process.env.GROQ_API_KEY ? "configured" : "missing",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.json({ name: "nextkazcrmai", health: "/api/health" });
});

const PORT = Number(process.env.PORT ?? 3000);

async function resolveMongoUri(): Promise<string> {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  console.log("MONGODB_URI not set — starting in-memory MongoDB (mongodb-memory-server)");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mem = await MongoMemoryServer.create();
  return mem.getUri();
}

async function bootstrap(): Promise<void> {
  const uri = await resolveMongoUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log("MongoDB connected");

  if (process.env.SEED_ON_BOOT === "true" || !process.env.MONGODB_URI) {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log("DB empty — auto-seeding demo data...");
      const stats = await runSeed();
      console.log(`Seeded ${stats.users} users, ${stats.clients} clients, ${stats.tickets} tickets`);
    }
  }
}

app.listen(PORT, () => console.log(`HTTP listening on ${PORT}`));

bootstrap().catch((err) => {
  console.error("Bootstrap failed:", (err as Error).message);
});
