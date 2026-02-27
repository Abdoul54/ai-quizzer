import { Worker, type Job, UnrecoverableError } from "bullmq";
import { redis } from "@/lib/redis";
import { questionMinion, singleOptionMinion, typeMinion, distractionMinion } from "@/agents/minions";
import type { MinionJobData } from "@/lib/queue";
import { db } from "@/db";
import { quiz } from "@/db/schema";
import { eq } from "drizzle-orm";

const CONCURRENCY = Number(process.env.MINION_CONCURRENCY ?? 5);
const JOB_TIMEOUT_MS = 60_000;

// ─── Result channel ───────────────────────────────────────────────────────────

export function minionResultChannel(jobId: string) {
    return `improvement:${jobId}:result`;
}

// ─── Post-processing ──────────────────────────────────────────────────────────

type QuestionType = "true_false" | "single_choice" | "multiple_choice";

type Question = {
    questionText: string;
    questionType: QuestionType;
    options: { optionText: string; isCorrect: boolean }[];
};

function enforceStructure(q: Question, newType: QuestionType): Question {
    if (newType === "true_false") {
        const hadCorrect = q.options?.some((o) => o.isCorrect);
        return {
            questionText: q.questionText,
            questionType: "true_false",
            options: [
                { optionText: "True", isCorrect: !!hadCorrect },
                { optionText: "False", isCorrect: !hadCorrect },
            ],
        };
    }

    if (newType === "single_choice") {
        let options = q.options?.slice(0, 5) || [];
        if (options.length < 3) {
            options.push(
                { optionText: "None of the above", isCorrect: false },
                { optionText: "All of the above", isCorrect: false }
            );
        }
        const correct = options.filter((o) => o.isCorrect);
        if (correct.length !== 1) {
            options = options.map((o, i) => ({ ...o, isCorrect: i === 0 }));
        }
        return { questionText: q.questionText, questionType: "single_choice", options: options.slice(0, 5) };
    }

    if (newType === "multiple_choice") {
        let options = q.options?.slice(0, 5) || [];
        if (options.length < 3) {
            options.push(
                { optionText: "Option A", isCorrect: true },
                { optionText: "Option B", isCorrect: true },
                { optionText: "Option C", isCorrect: false }
            );
        }
        const correct = options.filter((o) => o.isCorrect);
        if (correct.length < 2) {
            options = options.map((o, i) => ({ ...o, isCorrect: i < 2 }));
        }
        return { questionText: q.questionText, questionType: "multiple_choice", options: options.slice(0, 5) };
    }

    return q;
}

// ─── Job runner ───────────────────────────────────────────────────────────────

async function runMinion(job: Job<MinionJobData>) {
    const data = job.data;
    const channel = minionResultChannel(job.id!);

    // Fetch architecture from DB — gives minions full context on topic, difficulty, language
    const quizRecord = await db.query.quiz.findFirst({
        where: eq(quiz.id, data.quizId),
        columns: { architecture: true },
    });
    const architecture = quizRecord?.architecture ?? undefined;

    try {
        let result: unknown;

        if (data.scope === "question_text") {
            const output = await questionMinion({ ...data, architecture });
            result = output;
        }

        if (data.scope === "single_option") {
            const output = await singleOptionMinion({ ...data, architecture });
            result = { optionText: output.optionText, isCorrect: data.option.isCorrect };
        }

        if (data.scope === "change_type") {
            const output = await typeMinion({ ...data, architecture });
            result = enforceStructure(output, data.newType);
        }

        if (data.scope === "add_distractor") {
            const output = await distractionMinion({ ...data, architecture });
            result = { optionText: output.optionText, isCorrect: false };
        }

        const resultPayload = JSON.stringify({ ok: true, data: result });
        await Promise.all([
            redis.set(`improvement:${job.id!}:result`, resultPayload, "EX", 300),
            redis.publish(channel, resultPayload),
        ]);
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Improvement failed. Please try again.";

        const errorPayload = JSON.stringify({ ok: false, error: message });
        await Promise.all([
            redis.set(`improvement:${job.id!}:result`, errorPayload, "EX", 300),
            redis.publish(channel, errorPayload),
        ]);

        const unrecoverable = ["invalid_api_key", "insufficient_quota", "content_policy"].some(
            (p) => message.toLowerCase().includes(p)
        );
        if (unrecoverable) throw new UnrecoverableError(message);

        throw err;
    }
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function startMinionWorker() {
    const worker = new Worker<MinionJobData>(
        "minion-improvement",
        (job) =>
            Promise.race([
                runMinion(job),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("timeout")), JOB_TIMEOUT_MS)
                ),
            ]),
        {
            connection: redis,
            concurrency: CONCURRENCY,
        }
    );

    worker.on("active", (job) => {
        console.log(`[minion] Job ${job.id} active — scope: ${job.data.scope}`);
    });

    worker.on("completed", (job) => {
        console.log(`[minion] Job ${job.id} completed — scope: ${job.data.scope}`);
    });

    worker.on("failed", (job, err) => {
        const attemptsLeft = job ? (job.opts.attempts ?? 1) - job.attemptsMade : 0;
        console.error(
            `[minion] Job ${job?.id} failed (${attemptsLeft} retries left): ${err.message}`
        );
    });

    worker.on("error", (err) => {
        console.error("[minion] Worker error:", err);
    });

    console.log(`[minion] Started (concurrency: ${CONCURRENCY})`);

    return worker;
}