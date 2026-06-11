import "./env";
import app from "./app";
import { logger } from "./lib/logger";
import { ensureSchema } from "./ensureSchema";

import { NotificationService } from "./services/notificationService";
import { VoiceScheduleService } from "./services/voiceScheduleService";

// Start background services
NotificationService.init();
VoiceScheduleService.init();

// Ensure additive schema (chat messages table) exists. Non-blocking: a failure
// is logged but never prevents the server from listening.
ensureSchema();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening on 0.0.0.0");
});

// Graceful shutdown handlers
const shutdown = () => {
  logger.info("Gracefully shutting down server...");
  server.close(() => {
    logger.info("Server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled Rejection");
});

// Prevent process from exiting due to event loop emptying.
// In bundled environments with worker threads (e.g. pino-worker), 
// the main thread can sometimes improperly unref server sockets.
setInterval(() => {}, 1000 * 60 * 60); // 1 hour interval


