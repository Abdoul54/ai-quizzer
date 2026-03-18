import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { startGeneration } from "./quiz-generation.worker";
import { startMinionWorker } from "./minion.worker";
import { quizQueue, minionQueue, translationQueue } from "@/lib/queue";
import logger from "@/lib/logger";
import { startTranslationWorker } from "./translation.worker";

const worker = startGeneration();
const minionWorker = startMinionWorker();
const translationWorker = startTranslationWorker();

const app = express();

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/", (_req, res) => res.status(200).send("ok"));

// ─── Bull Board basic auth ────────────────────────────────────────────────────

const BOARD_USER = process.env.BULL_BOARD_USER;
const BOARD_PASSWORD = process.env.BULL_BOARD_PASSWORD;

function boardAuth(req: Request, res: Response, next: NextFunction) {
    // In production, block entirely if credentials are not configured
    if (!BOARD_USER || !BOARD_PASSWORD) {
        if (process.env.NODE_ENV === "production") {
            res.status(503).send("Bull Board is not configured");
            return;
        }
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Basic ")) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
        res.status(401).send("Authentication required");
        return;
    }

    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const colonIndex = decoded.indexOf(":");
    const user = decoded.slice(0, colonIndex);
    const pass = decoded.slice(colonIndex + 1);

    if (user !== BOARD_USER || pass !== BOARD_PASSWORD) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
        res.status(401).send("Invalid credentials");
        return;
    }

    next();
}

// ─── Bull Board ───────────────────────────────────────────────────────────────

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/board");
createBullBoard({
    queues: [
        new BullMQAdapter(quizQueue),
        new BullMQAdapter(minionQueue),
        new BullMQAdapter(translationQueue),
    ],
    serverAdapter,
});
app.use("/board", boardAuth, serverAdapter.getRouter());

// ─── Server ───────────────────────────────────────────────────────────────────

const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? 3001);
const server = app.listen(HEALTH_PORT, () => {
    logger.info({ port: HEALTH_PORT }, "Worker server listening");
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string) {
    logger.info({ signal }, "Shutdown signal received, shutting down gracefully");

    await new Promise((r) => setTimeout(r, 2_000));
    await Promise.all([worker.close(), minionWorker.close(), translationWorker.close()]);
    server.close();

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