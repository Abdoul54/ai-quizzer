import { Worker, type Job, UnrecoverableError } from "bullmq";
import { redis } from "@/lib/redis";
import { typeMinion, regenerateQuestionMinion, addQuestionMinion, distractorMinion, customInstructionMinion } from "@/agents/minions";
import type { MinionJobData } from "@/lib/queue";
import { db } from "@/db";
import { quiz } from "@/db/schema";
import { eq } from "drizzle-orm";
import logger, { minionLogger } from "@/lib/logger";

const CONCURRENCY = Number(process.env.MINION_CONCURRENCY ?? 5);
const JOB_TIMEOUT_MS = 60_000;

export function minionResultChannel(jobId: string) {
    return `improvement:${jobId}:result`;
}

// ─── Structural guard ─────────────────────────────────────────────────────────

type QuestionType = "true_false" | "single_choice" | "multiple_choice";
type Question = { questionText: string; questionType: QuestionType; options: { optionText: string; isCorrect: boolean }[] };

function enforceStructure(q: Question, targetType: QuestionType): Question {
    if (targetType === "true_false") {
        const hadCorrect = q.options.some((o) => o.isCorrect);
        return {
            questionText: q.questionText,
            questionType: "true_false",
            options: [
                { optionText: "True", isCorrect: !!hadCorrect },
                { optionText: "False", isCorrect: !hadCorrect },
            ],
        };
    }
    if (targetType === "single_choice") {
        let options = q.options.slice(0, 5);
        if (options.length < 3) options = [...options, { optionText: "None of the above", isCorrect: false }, { optionText: "All of the above", isCorrect: false }];
        const correctCount = options.filter((o) => o.isCorrect).length;
        if (correctCount !== 1) options = options.map((o, i) => ({ ...o, isCorrect: i === 0 }));
        return { questionText: q.questionText, questionType: "single_choice", options: options.slice(0, 5) };
    }
    if (targetType === "multiple_choice") {
        let options = q.options.slice(0, 5);
        if (options.length < 3) options = [...options, { optionText: "Option A", isCorrect: true }, { optionText: "Option B", isCorrect: false }];
        const correctCount = options.filter((o) => o.isCorrect).length;
        if (correctCount < 2) options = options.map((o, i) => ({ ...o, isCorrect: i < 2 }));
        return { questionText: q.questionText, questionType: "multiple_choice", options: options.slice(0, 5) };
    }
    return q;
}

// ─── Job runner ───────────────────────────────────────────────────────────────

async function runMinion(job: Job<MinionJobData>) {
    const data = job.data;
    const channel = minionResultChannel(job.id!);
    const log = minionLogger(job.id!, data.quizId, data.scope);

    log.info("Minion job started");

    const quizRecord = await db.query.quiz.findFirst({
        where: eq(quiz.id, data.quizId),
        columns: { architecture: true, documentIds: true, userId: true },  // ← add userId
    });

    const userId = quizRecord?.userId ?? "";
    const architecture = quizRecord?.architecture ?? undefined;
    const documentIds: string[] = quizRecord?.documentIds ?? [];

    try {
        let result: unknown;
        const start = Date.now();

        if (data.scope === "change_type") {
            log.debug({ newType: data.newType }, "Running change_type minion");
            const output = await typeMinion({ ...data, architecture, userId });
            result = enforceStructure(output, data.newType);
        }

        if (data.scope === "regenerate_question") {
            log.debug("Running regenerate_question minion");
            const output = await regenerateQuestionMinion({ ...data, architecture, documentIds, userId });
            result = enforceStructure(output, data.question.questionType);
        }

        if (data.scope === "add_question") {
            log.debug("Running add_question minion");
            const output = await addQuestionMinion({ ...data, architecture, documentIds, userId });
            result = enforceStructure(output, output.questionType);
        }

        if (data.scope === "add_distractor") {
            log.debug("Running add_distractor minion");
            const output = await distractorMinion({ ...data, architecture, userId });
            result = { optionText: output.optionText, isCorrect: false };
        }

        if (data.scope === "custom_instruction") {
            log.debug({ instruction: data.instruction }, "Running custom_instruction minion");
            const output = await customInstructionMinion({ ...data, architecture, userId });
            result = enforceStructure(output, data.question.questionType);
        }

        log.info({ durationMs: Date.now() - start }, "Minion completed");

        const resultPayload = JSON.stringify({ ok: true, data: result });
        await Promise.all([
            redis.set(`improvement:${job.id!}:result`, resultPayload, "EX", 300),
            redis.publish(channel, resultPayload),
        ]);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Improvement failed. Please try again.";
        const unrecoverable = ["invalid_api_key", "insufficient_quota", "content_policy"].some(
            (p) => message.toLowerCase().includes(p)
        );

        log.error({ err, unrecoverable }, "Minion job failed");

        const errorPayload = JSON.stringify({ ok: false, error: message });
        await Promise.all([
            redis.set(`improvement:${job.id!}:result`, errorPayload, "EX", 300),
            redis.publish(channel, errorPayload),
        ]);

        if (unrecoverable) throw new UnrecoverableError(message);
        throw err;
    }
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function startMinionWorker() {
    const workerLog = logger.child({ component: "minion" });

    const worker = new Worker<MinionJobData>(
        "minion-improvement",
        (job) => Promise.race([
            runMinion(job),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), JOB_TIMEOUT_MS)),
        ]),
        { connection: redis, concurrency: CONCURRENCY }
    );

    worker.on("active", (job) => workerLog.info({ jobId: job.id, scope: job.data.scope }, "Job active"));
    worker.on("completed", (job) => workerLog.info({ jobId: job.id, scope: job.data.scope }, "Job completed"));
    worker.on("failed", (job, err) => workerLog.error({ jobId: job?.id, scope: job?.data.scope, err }, "Job failed"));
    worker.on("error", (err) => workerLog.error({ err }, "Worker error"));

    workerLog.info({ concurrency: CONCURRENCY }, "Minion worker started");
    return worker;
}