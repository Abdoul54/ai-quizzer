import "dotenv/config";
import { createServer } from "http";
import { startWorker } from "./quiz-generation.worker";
import { startMinionWorker } from "./minion.worker";
import logger from "@/lib/logger";

const worker = startWorker();
const minionWorker = startMinionWorker();

let healthy = true;

const healthServer = createServer((_req, res) => {
    if (healthy) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
    } else {
        res.writeHead(503, { "Content-Type": "text/plain" });
        res.end("shutting down");
    }
});

const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? 3001);
healthServer.listen(HEALTH_PORT, () => {
    logger.info({ port: HEALTH_PORT }, "Health check server listening");
});

async function shutdown(signal: string) {
    logger.info({ signal }, "Shutdown signal received, shutting down gracefully");
    healthy = false;

    await new Promise((r) => setTimeout(r, 2_000));
    await Promise.all([worker.close(), minionWorker.close()]);
    healthServer.close();

    logger.info("Shutdown complete");
    process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "Unhandled rejection");
    process.exit(1);
});