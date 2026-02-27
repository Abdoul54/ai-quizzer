import "dotenv/config";
import { createServer } from "http";
import { startWorker } from "./quiz-generation.worker";
import { startMinionWorker } from "./minion.worker";

const worker = startWorker();
const minionWorker = startMinionWorker();

// ── Health check server ───────────────────────────────────────────────────────
// Docker uses this to determine if the worker is alive.
// Responds 200 when the worker is running, 503 after shutdown begins.
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
    console.log(`[worker] Health check listening on :${HEALTH_PORT}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string) {
    console.log(`[worker] Received ${signal}, shutting down gracefully...`);
    healthy = false;

    await new Promise((r) => setTimeout(r, 2_000));

    await Promise.all([worker.close(), minionWorker.close()]);
    healthServer.close();

    console.log("[worker] Shutdown complete.");
    process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    console.error("[worker] Uncaught exception:", err);
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    console.error("[worker] Unhandled rejection:", reason);
    process.exit(1);
});