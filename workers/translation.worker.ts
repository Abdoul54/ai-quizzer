/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker, type Job } from "bullmq";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quiz, question, options } from "@/db/schema";
import { translator } from "@/agents/translator";
import { redis } from "@/lib/redis";
import logger, { workerLogger } from "@/lib/logger";
import type { TranslationJobData } from "@/lib/queue";

const CONCURRENCY = Number(process.env.TRANSLATION_CONCURRENCY ?? 3);
const JOB_TIMEOUT_MS = 5 * 60 * 1000;

async function runTranslation(job: Job<TranslationJobData>) {
    const { quizId, language } = job.data;
    const log = workerLogger(job.id!, quizId);

    log.info({ quizId, language }, "Translation job started");

    const quizRecord = await db.query.quiz.findFirst({
        where: eq(quiz.id, quizId),
        columns: { defaultLanguage: true, languages: true },
    });

    if (!quizRecord) throw new Error(`Quiz ${quizId} not found`);

    const defaultLang = quizRecord.defaultLanguage ?? "en";

    // Read published questions
    const publishedQuestions = await db.query.question.findMany({
        where: eq(question.quizId, quizId),
        with: { options: true },
    });

    if (!publishedQuestions.length) throw new Error("No published questions found");

    // Extract default-lang text as draft format for the translator
    const draft = publishedQuestions.map((q) => ({
        id: q.id,
        questionText: (q.questionText as Record<string, string>)[defaultLang] ?? Object.values(q.questionText as Record<string, string>)[0],
        questionType: q.questionType,
        options: q.options.map((o) => ({
            id: o.id,
            optionText: (o.optionText as Record<string, string>)[defaultLang] ?? Object.values(o.optionText as Record<string, string>)[0],
            isCorrect: o.isCorrect,
        })),
    }));

    const result = await translator({ languages: [language], draft });

    // Merge new translations into existing jsonb
    for (const q of publishedQuestions) {
        const translation = result?.questions?.find((t: any) => t.id === q.id);
        if (!translation) continue;

        const newQuestionText = translation.questionText?.find((t: any) => t.lang === language)?.text;
        if (newQuestionText) {
            await db
                .update(question)
                .set({
                    questionText: sql`${question.questionText} || ${JSON.stringify({ [language]: newQuestionText })}::jsonb`,
                })
                .where(eq(question.id, q.id));
        }

        for (const o of q.options) {
            const optTranslation = translation.options?.find((t: any) => t.id === o.id);
            const newOptionText = optTranslation?.optionText?.find((t: any) => t.lang === language)?.text;
            if (newOptionText) {
                await db
                    .update(options)
                    .set({
                        optionText: sql`${options.optionText} || ${JSON.stringify({ [language]: newOptionText })}::jsonb`,
                    })
                    .where(eq(options.id, o.id));
            }
        }
    }

    // Notify SSE
    await redis.srem(`quiz:${quizId}:translating`, language);
    await redis.publish(`quiz:${quizId}:translate`, JSON.stringify({ success: true, language }));

    log.info({ quizId, language }, "Translation completed");
}

async function processTranslation(job: Job<TranslationJobData>) {
    return Promise.race([
        runTranslation(job),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), JOB_TIMEOUT_MS)
        ),
    ]);
}

export function startTranslationWorker() {
    const log = logger.child({ component: "translation-worker" });

    const worker = new Worker<TranslationJobData>("translation", processTranslation, {
        connection: redis,
        concurrency: CONCURRENCY,
    });

    worker.on("active", (job) => log.info({ jobId: job.id, quizId: job.data.quizId }, "Translation active"));
    worker.on("completed", (job) => log.info({ jobId: job.id, quizId: job.data.quizId }, "Translation completed"));
    worker.on("failed", async (job, err) => {
        log.error({ jobId: job?.id, quizId: job?.data?.quizId, err }, "Translation failed");

        if (!job?.data) return;

        const { quizId, language } = job.data;

        // Clean up Redis
        await redis.srem(`quiz:${quizId}:translating`, language);

        // Remove the optimistically-added language from the quiz
        const quizRecord = await db.query.quiz.findFirst({
            where: eq(quiz.id, quizId),
            columns: { languages: true },
        });
        await db.update(quiz).set({
            languages: (quizRecord?.languages ?? []).filter((l) => l !== language) as any,
        }).where(eq(quiz.id, quizId));

        await redis.publish(
            `quiz:${quizId}:translate`,
            JSON.stringify({ success: false, error: "Translation failed. Please try again." })
        ).catch(() => { });
    });
    worker.on("error", (err) => log.error({ err }, "Translation worker error"));

    log.info({ concurrency: CONCURRENCY }, "Translation worker started");
    return worker;
}