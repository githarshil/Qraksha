import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/index.js";
import { ttsRouter } from "./routes/tts.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestLogger } from "./middleware/logger.middleware.js";

export const app = express();

app.use(requestLogger);

const rawAllowedOrigins =
  process.env.ALLOWED_ORIGINS ||
  process.env.CORS_ORIGIN ||
  "http://localhost:3000,http://localhost:3001";

const allowedOrigins = rawAllowedOrigins
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Restrict Vercel preview origins strictly to our account/team scope on Vercel
const vercelPreviewRegex =
  /^https:\/\/qraksha(-[a-z0-9-]+)?-harshils-projects-d798a108\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      if (vercelPreviewRegex.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  }),
);

app.use(express.json({ limit: "10mb" }));

// Lightweight root health check for cold starts and monitors
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/tts", ttsRouter);
app.use("/api/v1", apiRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource could not be found",
    },
  });
});

// Centralized error handler
app.use(errorHandler);
