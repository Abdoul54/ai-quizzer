import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const logger = pino(
    {
        level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
        base: { service: process.env.SERVICE_NAME ?? "ai-quizzer" },
        timestamp: pino.stdTimeFunctions.isoTime,
        // Redact sensitive fields wherever they appear in log objects
        redact: {
            paths: ["password", "token", "secret", "authorization", "cookie", "*.password", "*.token"],
            censor: "[REDACTED]",
        },
        serializers: {
            err: pino.stdSerializers.err,
            error: pino.stdSerializers.err,
        },
    },
    isDev
        ? pino.transport({
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "HH:MM:ss",
                ignore: "pid,hostname,service",
            },
        })
        : undefined // In production: raw JSON → stdout → log aggregator
);

export default logger;

// ─── Child loggers with pre-bound context ─────────────────────────────────────

/** For quiz generation worker jobs */
export const workerLogger = (jobId: string, quizId: string) =>
    logger.child({ component: "worker", jobId, quizId });

/** For minion improvement jobs */
export const minionLogger = (jobId: string, quizId: string, scope: string) =>
    logger.child({ component: "minion", jobId, quizId, scope });

/** For Next.js API route handlers */
export const apiLogger = (route: string, userId?: string) =>
    logger.child({ component: "api", route, userId });

/** For AI agents */
export const agentLogger = (agent: "architect" | "builder" | "translator" | "editor", quizId?: string) =>
    logger.child({ component: "agent", agent, quizId });

/** For document processing */
export const uploadLogger = (userId?: string) =>
    logger.child({ component: "upload", userId });