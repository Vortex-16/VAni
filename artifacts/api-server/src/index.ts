import "./env";
import app from "./app";
import { logger } from "./lib/logger";
import { ensureSchema } from "./ensureSchema";

import { NotificationService } from "./services/notificationService";

// Start background services
NotificationService.init();

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

app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening on 0.0.0.0");
});

