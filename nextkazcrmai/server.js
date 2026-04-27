require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const { clientRouter, userRouter } = require("./routes/resources");
const analyticsRoutes = require("./routes/analytics");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/clients", clientRouter);
app.use("/api/users", userRouter);
app.use("/api/analytics", analyticsRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    groq: process.env.GROQ_API_KEY ? "configured" : "missing",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({ name: "nextkazcrmai", health: "/api/health" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`HTTP listening on ${PORT}`));

if (!process.env.MONGODB_URI) {
  console.warn("MONGODB_URI is not set — DB-backed routes will return 500 until configured.");
} else {
  mongoose
    .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err.message));
}
