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
// How long to keep the result key in Redis so the SSE route can read it on a
// late connection (covers the race between POST and EventSource subscribe).
const RESULT_TTL_S = 60;

function resultKey(quizId: string, language: string) {
    return `quiz:${quizId}:translate:result:${language}`;
}

async function runTranslation(job: Job<TranslationJobData>) {
    const { quizId, language, userId } = job.data;
    const log = workerLogger(job.id!, quizId);

    log.info({ quizId, language }, "Translation job started");

    const quizRecord = await db.query.quiz.findFirst({
        where: eq(quiz.id, quizId),
        columns: { defaultLanguage: true, languages: true },
    });

    if (!quizRecord) throw new Error(`Quiz ${quizId} not found`);

    const defaultLang = quizRecord.defaultLanguage ?? "en";

    const publishedQuestions = await db.query.question.findMany({
        where: eq(question.quizId, quizId),
        with: { options: true },
    });

    if (!publishedQuestions.length) throw new Error("No published questions found");

    // Extract default-lang text as draft format for the translator
    const draft = publishedQuestions.map((q) => ({
        id: q.id,
        questionText:
            (q.questionText as Record<string, string>)[defaultLang] ??
            Object.values(q.questionText as Record<string, string>)[0],
        questionType: q.questionType,
        options: q.options.map((o) => ({
            id: o.id,
            optionText:
                (o.optionText as Record<string, string>)[defaultLang] ??
                Object.values(o.optionText as Record<string, string>)[0],
            isCorrect: o.isCorrect,
        })),
    }));

    const result = await translator({ languages: [language], draft, quizId, userId });

    // ── Parallel DB updates ─────────────────────────────────────────────────
    await Promise.all(
        publishedQuestions.map(async (q) => {
            const translation = result?.questions?.find((t: any) => t.id === q.id);
            if (!translation) return;

            const newQuestionText = translation.questionText?.find(
                (t: any) => t.lang === language
            )?.text;

            const updates: Promise<unknown>[] = [];

            if (newQuestionText) {
                updates.push(
                    db
                        .update(question)
                        .set({
                            questionText: sql`${question.questionText} || ${JSON.stringify({
                                [language]: newQuestionText,
                            })}::jsonb`,
                        })
                        .where(eq(question.id, q.id))
                );
            }

            for (const o of q.options) {
                const optTranslation = translation.options?.find((t: any) => t.id === o.id);
                const newOptionText = optTranslation?.optionText?.find(
                    (t: any) => t.lang === language
                )?.text;

                if (newOptionText) {
                    updates.push(
                        db
                            .update(options)
                            .set({
                                optionText: sql`${options.optionText} || ${JSON.stringify({
                                    [language]: newOptionText,
                                })}::jsonb`,
                            })
                            .where(eq(options.id, o.id))
                    );
                }
            }

            await Promise.all(updates);
        })
    );
    // ────────────────────────────────────────────────────────────────────────

    const payload = JSON.stringify({ success: true, language });

    // Store result for SSE clients that connect after the publish fires
    await redis.set(resultKey(quizId, language), payload, "EX", RESULT_TTL_S);

    await redis.srem(`quiz:${quizId}:translating`, language);
    await redis.publish(`quiz:${quizId}:translate`, payload);

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

    worker.on("active", (job) =>
        log.info({ jobId: job.id, quizId: job.data.quizId }, "Translation active")
    );
    worker.on("completed", (job) =>
        log.info({ jobId: job.id, quizId: job.data.quizId }, "Translation completed")
    );
    worker.on("failed", async (job, err) => {
        log.error({ jobId: job?.id, quizId: job?.data?.quizId, err }, "Translation failed");

        if (!job?.data) return;

        const { quizId, language } = job.data;

        const errorPayload = JSON.stringify({
            success: false,
            language,
            error: "Translation failed. Please try again.",
        });

        // Store error result so late SSE connections get it too
        await redis.set(resultKey(quizId, language), errorPayload, "EX", RESULT_TTL_S);

        await redis.srem(`quiz:${quizId}:translating`, language);

        // Roll back the optimistically-added language
        const quizRecord = await db.query.quiz.findFirst({
            where: eq(quiz.id, quizId),
            columns: { languages: true },
        });
        await db
            .update(quiz)
            .set({
                languages: (quizRecord?.languages ?? []).filter((l) => l !== language) as any,
            })
            .where(eq(quiz.id, quizId));

        await redis
            .publish(`quiz:${quizId}:translate`, errorPayload)
            .catch(() => { });
    });
    worker.on("error", (err) => log.error({ err }, "Translation worker error"));

    log.info({ concurrency: CONCURRENCY }, "Translation worker started");
    return worker;
}