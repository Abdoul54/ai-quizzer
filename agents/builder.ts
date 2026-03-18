import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db';
import { draft } from '@/db/schema';
import { agentLogger } from '@/lib/logger';
import { trackUsage } from '@/lib/lib/track-usage';
import { builderSystemPrompt, buildBuilderPrompt } from '@/agents/prompts/builder';

const quizOutputSchema = Output.object({
    schema: z.object({
        questions: z.array(z.object({
            questionText: z.string(),
            questionType: z.enum(['true_false', 'single_choice', 'multiple_choice']),
            sourceEvidence: z.string(), // passage from context that justifies the correct answer
            options: z.array(z.object({
                optionText: z.string(),
                isCorrect: z.boolean(),
            })),
        })),
    })
});

interface BuilderInput {
    quizId: string;
    userId: string;
    architecture: string;
    documentContext: string; // pre-fetched, organized per question by the retrieval step
    questionCount?: number;
}

const MAX_ATTEMPTS = 3;

const UNRECOVERABLE_PATTERNS = [
    'invalid_api_key',
    'insufficient_quota',
    'rate_limit_exceeded',
    'context_length_exceeded',
    'content_policy_violation',
];

function isUnrecoverable(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    return UNRECOVERABLE_PATTERNS.some(p => msg.includes(p));
}

export const builder = async ({
    quizId,
    architecture,
    documentContext,
    userId,
    questionCount = 10,
}: BuilderInput): Promise<string> => {
    let lastError: unknown;
    const hasContext = documentContext.trim().length > 0;
    const log = agentLogger('builder', quizId);

    log.info({
        architectureLength: architecture.length,
        contextLength: documentContext.length,
        questionCount,
        hasContext,
    }, 'Builder started');

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const attemptStart = Date.now();

        try {
            if (attempt > 1) {
                log.warn({ attempt, maxAttempts: MAX_ATTEMPTS }, 'Builder retrying');
            }

            const retryWarning = attempt > 1
                ? `\n\nCRITICAL: Your previous attempt returned an empty questions array. You MUST return exactly ${questionCount} questions. An empty array is completely unacceptable — write the questions now.`
                : '';

            const { output } = await generateText({
                model: openai(process.env.BUILDER || 'gpt-4o-mini'),
                output: quizOutputSchema,
                temperature: 0.2,
                maxOutputTokens: 4096,
                maxRetries: 3,
                timeout: { totalMs: 120000 },
                onFinish: async ({ usage }) => {
                    await trackUsage({
                        userId,
                        quizId,
                        source: "builder",
                        model: process.env.BUILDER || "gpt-4o-mini",
                        inputTokens: usage?.inputTokens,
                        outputTokens: usage?.outputTokens,
                    });
                },
                system: hasContext ? builderSystemPrompt.withContext : builderSystemPrompt.withoutContext,
                prompt: buildBuilderPrompt({
                    questionCount,
                    architecture,
                    documentContext,
                    hasContext,
                    retryWarning,
                }),
            });

            if (!output || output.questions.length === 0) {
                log.warn({ attempt }, 'Builder returned empty questions array');
                throw new Error('Builder produced an empty questions array.');
            }

            const builtCount = output.questions.length;
            const typeCounts = output.questions.reduce<Record<string, number>>((acc, q) => {
                acc[q.questionType] = (acc[q.questionType] ?? 0) + 1;
                return acc;
            }, {});

            log.debug({
                attempt,
                durationMs: Date.now() - attemptStart,
                questionCount: builtCount,
                typeCounts,
            }, 'Builder LLM call complete');

            // Strip sourceEvidence before persisting — it's a generation discipline tool,
            // not user-facing data. Remove this if you want to store it for auditing.
            const questionsWithIds = output.questions.map(({ sourceEvidence: _, ...q }) => ({
                id: uuidv4(),
                ...q,
                options: q.options.map(o => ({
                    id: uuidv4(),
                    ...o,
                })),
            }));

            const [inserted] = await db
                .insert(draft)
                .values({ quizId, content: { questions: questionsWithIds } })
                .returning({ id: draft.id });

            log.info({
                attempt,
                draftId: inserted.id,
                questionCount: builtCount,
                typeCounts,
                durationMs: Date.now() - attemptStart,
            }, 'Builder completed — draft saved');

            return inserted.id;

        } catch (err) {
            lastError = err;

            if (isUnrecoverable(err)) {
                log.error({ err, attempt }, 'Builder encountered unrecoverable error — not retrying');
                throw err;
            }

            log.warn({
                attempt,
                maxAttempts: MAX_ATTEMPTS,
                err,
                durationMs: Date.now() - attemptStart,
            }, 'Builder attempt failed');

            if (attempt < MAX_ATTEMPTS) {
                const delay = 1000 * attempt;
                log.debug({ delay }, 'Builder waiting before retry');
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    log.error({ err: lastError, maxAttempts: MAX_ATTEMPTS }, 'Builder exhausted all attempts');

    throw new Error(
        `Builder failed after ${MAX_ATTEMPTS} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
};