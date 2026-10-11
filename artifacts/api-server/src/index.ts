import http from "http";
import app from "./app";
import { initRealtime } from "./realtime";
import { logger } from "./lib/logger";
import { ensureHubMonetizationSchema } from "./lib/hub-monetization";

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

const server = http.createServer(app);
initRealtime(server);

ensureHubMonetizationSchema()
  .catch((err) => {
    logger.error({ err }, "Failed to ensure hub monetization schema on boot");
  })
  .finally(() => {
    server.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
  });


