import "dotenv/config";
import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { startWorker } from "./quiz-generation.worker";
import { startMinionWorker } from "./minion.worker";
import { quizQueue, minionQueue } from "@/lib/queue";
import logger from "@/lib/logger";

const worker = startWorker();
const minionWorker = startMinionWorker();

const app = express();

// Health check
app.get("/", (_req, res) => res.status(200).send("ok"));

// Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/board");
createBullBoard({
    queues: [new BullMQAdapter(quizQueue), new BullMQAdapter(minionQueue)],
    serverAdapter,
});
app.use("/board", serverAdapter.getRouter());

const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? 3001);
const server = app.listen(HEALTH_PORT, () => {
    logger.info({ port: HEALTH_PORT }, "Worker server listening");
});

async function shutdown(signal: string) {
    logger.info({ signal }, "Shutdown signal received, shutting down gracefully");

    await new Promise((r) => setTimeout(r, 2_000));
    await Promise.all([worker.close(), minionWorker.close()]);
    server.close();

    logger.info("Shutdown complete");
    process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => { logger.fatal({ err }, "Uncaught exception"); process.exit(1); });
process.on("unhandledRejection", (reason) => { logger.fatal({ reason }, "Unhandled rejection"); process.exit(1); });