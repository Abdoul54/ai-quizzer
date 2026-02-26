import { Worker, type Job, UnrecoverableError } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quiz } from "@/db/schema";
import { architect } from "@/agents/architect";
import { builder } from "@/agents/builder";
import { redis } from "@/lib/redis";
import type { QuizGenerationJobData } from "@/lib/queue";
import type { InferSelectModel } from "drizzle-orm";

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 2);

type QuizStatus = InferSelectModel<typeof quiz>["status"];

const JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const STATUS_STEP: Record<QuizStatus, number> = {
    queued: 0,
    architecting: 1,
    building: 2,
    draft: 3,
    published: 3,
    archived: 3,
    failed: -1,
};

// Errors that should NOT be retried — bad input, quota exceeded, etc.
const UNRECOVERABLE_PATTERNS = [
    "invalid_api_key",
    "insufficient_quota",
    "rate_limit_exceeded",
    "context_length_exceeded",
    "content_policy_violation",
];

function isUnrecoverable(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    return UNRECOVERABLE_PATTERNS.some((p) => msg.includes(p));
}

// Sanitize error — never expose internal details to the client
function toUserMessage(err: unknown): string {
    if (!(err instanceof Error)) return "Quiz generation failed. Please try again.";

    const msg = err.message.toLowerCase();

    if (msg.includes("invalid_api_key") || msg.includes("authentication"))
        return "AI service configuration error. Please contact support.";
    if (msg.includes("insufficient_quota") || msg.includes("rate_limit"))
        return "AI service is temporarily unavailable. Please try again later.";
    if (msg.includes("context_length") || msg.includes("content_policy"))
        return "The provided documents or topic could not be processed. Please try different content.";
    if (msg.includes("timeout"))
        return "Quiz generation timed out. Please try again with fewer questions or simpler content.";

    return "Quiz generation failed. Please try again.";
}

async function publish(
    quizId: string,
    status: QuizStatus,
    dbExtra?: Record<string, unknown>,
    publishExtra?: Record<string, unknown>
) {
    await db.update(quiz).set({ status, ...dbExtra }).where(eq(quiz.id, quizId));
    await redis.publish(
        `quiz:${quizId}:status`,
        JSON.stringify({
            status,
            step: STATUS_STEP[status],
            ...publishExtra,
        })
    );
}

async function runJob(job: Job<QuizGenerationJobData>) {
    const { quizId, input } = job.data;

    try {
        // ── Step 1: Architect ────────────────────────────────────────────────
        await publish(quizId, "architecting");
        await job.updateProgress(10);

        const architecture = await architect({
            documents: input.documentIds ?? [],
            topic: input.topic,
            questionCount: input.questionCount ?? 10,
            difficulty: input.difficulty ?? "medium",
            questionTypes: input.questionTypes ?? ["true_false", "single_choice"],
            language: input.defaultLanguage,
            additionalPrompt: input.additionalPrompt,
        });

        // Save architecture silently — status hasn't changed, no publish needed
        await db.update(quiz).set({ architecture }).where(eq(quiz.id, quizId));
        await job.updateProgress(40);

        // ── Step 2: Builder ──────────────────────────────────────────────────
        await publish(quizId, "building");
        await job.updateProgress(50);

        await builder({
            quizId,
            architecture,
            documentIds: input.documentIds ?? [],
        });

        await job.updateProgress(100);
        await publish(quizId, "draft");

    } catch (err) {
        const userMessage = toUserMessage(err);

        // Log full error server-side only
        console.error(`[worker] Job ${job.id} failed for quizId ${quizId}:`, err);

        await publish(
            quizId,
            "failed",
            { errorMessage: userMessage },
            { errorMessage: userMessage }
        );

        // Unrecoverable errors: skip retries immediately
        if (isUnrecoverable(err)) {
            throw new UnrecoverableError(userMessage);
        }

        throw err;
    }
}

async function processQuizGeneration(job: Job<QuizGenerationJobData>) {
    return Promise.race([
        runJob(job),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), JOB_TIMEOUT_MS)
        ),
    ]);


}

export function startWorker() {
    const worker = new Worker<QuizGenerationJobData>(
        "quiz-generation",
        processQuizGeneration,
        {
            connection: redis,
            concurrency: CONCURRENCY,
        }
    );

    worker.on("active", (job) => {
        console.log(`[worker] Job ${job.id} active — quizId: ${job.data.quizId}`);
    });

    worker.on("completed", (job) => {
        console.log(`[worker] Job ${job.id} completed — quizId: ${job.data.quizId}`);
    });

    worker.on("failed", (job, err) => {
        const attemptsLeft = job ? (job.opts.attempts ?? 1) - job.attemptsMade : 0;
        console.error(
            `[worker] Job ${job?.id} failed (${attemptsLeft} retries left):`,
            err.message
        );
    });

    worker.on("error", (err) => {
        console.error("[worker] Worker error:", err);
    });

    console.log(`[worker] Started (concurrency: ${CONCURRENCY})`);

    return worker;
}