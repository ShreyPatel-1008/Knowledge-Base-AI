import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { mkdirSync } from "fs";

import config from "./config/index.js";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import studyRoutes from "./routes/studyRoutes.js";
import ingestRoutes from "./routes/ingestRoutes.js";
import memoryRoutes from "./routes/memoryRoutes.js";

// ── Ensure directories exist ────────────────────────
mkdirSync("uploads/documents", { recursive: true });

// ── Bootstrap Express ───────────────────────────────
const app = express();

// ── Security Headers ────────────────────────────────
app.use(helmet());

// ── Global Middleware ───────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Rate Limiting ───────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes.",
  },
});
app.use("/api", apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // 30 attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again in 15 minutes.",
  },
});

// ── Health-check ────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "KnowledgeBase API is running 🚀" });
});

// ── Routes ──────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/ingest", ingestRoutes);
app.use("/api/memories", memoryRoutes);

// ── Error handler ───────────────────────────────────
app.use(errorHandler);

// ── Connect DB and Start server ─────────────────────
async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(
      `🚀  Server running on http://localhost:${config.port}  [${config.nodeEnv}]`
    );
  });
}

start();
