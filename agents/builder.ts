import { generateText, Output, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db';
import { draft } from '@/db/schema';
import { createSearchDocsTool } from '@/lib/tools/search-docs';
import { agentLogger } from '@/lib/logger';
import { trackUsage } from '@/lib/lib/track-usage';

const quizOutputSchema = Output.object({
    schema: z.object({
        questions: z.array(z.object({
            questionText: z.string(),
            questionType: z.enum(['true_false', 'single_choice', 'multiple_choice']),
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
    documentIds: string[];
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

export const builder = async ({ quizId, architecture, documentIds, userId, questionCount = 10 }: BuilderInput): Promise<string> => {
    let lastError: unknown;
    const hasDocuments = documentIds.length > 0;
    const log = agentLogger('builder', quizId);

    log.info({
        documentCount: documentIds.length,
        architectureLength: architecture.length,
        questionCount,
        hasDocuments,
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
                tools: hasDocuments ? { searchDocs: createSearchDocsTool(documentIds) } : undefined,
                stopWhen: stepCountIs(5),
                prepareStep: ({ stepNumber }) => {
                    // After 2 searches, force output — no more tool calls allowed
                    if (stepNumber >= 2) {
                        return { toolChoice: 'none' };
                    }
                },
                onStepFinish: ({ toolResults }) => {
                    if (toolResults.length > 0 && toolResults.every(
                        r => typeof r.output === 'string' && r.output.startsWith('RETRIEVAL_FAILED')
                    )) {
                        log.error({ quizId, attempt }, 'All searchDocs calls failed in step — aborting');
                        throw new Error('RETRIEVAL_FAILED: All document searches returned no results. Ensure documents are uploaded and embeddings are generated.');
                    }
                },
                onFinish: async ({ usage }) => {
                    await trackUsage({
                        userId: userId,
                        quizId: quizId,
                        source: "builder",
                        model: process.env.BUILDER || "gpt-4o-mini",
                        inputTokens: usage?.inputTokens,
                        outputTokens: usage?.outputTokens,
                    });
                },
                system: hasDocuments
                    ? `You are a quiz question writer. Your only source of truth is the content returned by searchDocs.

SEARCH STRATEGY:
- You have 5 steps total. Steps 1–2 are for searching. Step 3 is for writing ALL questions.
- Call searchDocs exactly 2 times, with different queries targeting different topics from the architecture.
- After step 2, you MUST write all ${questionCount} questions immediately. Do NOT call any more tools.
- Write all questions in a single step — do not split them.

GROUNDING RULES — these are absolute:
- Every correct answer must appear explicitly in a searchDocs result. Do not infer, extrapolate, or use general knowledge.
- Every distractor (incorrect option) must be plausible given the document content but clearly not the answer per the docs.
- If searchDocs does not return enough content to write a question with confidence, write a simpler question about what was found rather than filling gaps from memory.

QUESTION TYPE RULES:
- Only use multiple_choice if the document content clearly contains multiple distinct correct answers for that question. Do not force multiple_choice to match the architecture if the content only supports one correct answer — downgrade to single_choice instead.
- For true_false: exactly 2 options (True, False), one correct.
- For single_choice: 3–5 options, exactly one correct.
- For multiple_choice: 3–5 options, 2 or more correct — all correct answers must be explicitly found in the docs.

OTHER RULES:
- Follow the architecture for question count, difficulty, language, and topic distribution.
- Write clear, unambiguous questions. No trick wording.
- Never invent proper nouns (names, places, values, dates) that were not returned by searchDocs.`
                    : `You are a quiz question writer. Produce all ${questionCount} questions in a single response — do not split across steps.

RULES:
- Follow the architecture exactly: question count, types, difficulty, language, topic distribution.
- For true_false: exactly 2 options (True, False), one correct.
- For single_choice: 3–5 options, exactly one correct.
- For multiple_choice: 3–5 options, 2 or more correct.
- Write clear, unambiguous questions. No trick wording.`,
                prompt: `Build the quiz questions from this architecture:\n\n${architecture}${retryWarning}`,
            });

            // gpt-4o-mini can silently return an empty array — treat it as a retryable failure
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

            const questionsWithIds = output.questions.map(q => ({
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