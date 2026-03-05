import { generateText, Output, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db';
import { draft } from '@/db/schema';
import { searchDocs } from '@/lib/tools/search-docs';
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
}

const MAX_ATTEMPTS = 3;

export const builder = async ({ quizId, architecture, documentIds, userId }: BuilderInput): Promise<string> => {
    let lastError: unknown;
    const hasDocuments = documentIds.length > 0;
    const log = agentLogger('builder', quizId);

    log.info({
        documentCount: documentIds.length,
        architectureLength: architecture.length,
        hasDocuments,
    }, 'Builder started');

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const attemptStart = Date.now();

        try {
            if (attempt > 1) {
                log.warn({ attempt, maxAttempts: MAX_ATTEMPTS }, 'Builder retrying');
            }

            const { output } = await generateText({
                model: openai(process.env.BUILDER || 'gpt-4o-mini'),
                output: quizOutputSchema,
                tools: hasDocuments ? { searchDocs } : undefined,
                stopWhen: stepCountIs(8),
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
                system: hasDocuments ? `You are a quiz question writer. Your only source of truth is the content returned by searchDocs.

SEARCH STRATEGY:
- Call searchDocs 3–5 times with different queries to gather broad coverage of the documents.
- You have 8 steps total. Use the first 5–6 steps for searches, then produce the output immediately. Do NOT call more than 6 tools.
- After your searches are done, write all questions in a single final step.

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
                    : `You are a quiz question writer.
You receive a quiz architecture written by an instructional designer and must produce the exact questions and answer options it specifies.

RULES:
- Follow the architecture exactly: question count, types, difficulty, language, topic distribution.
- For true_false: exactly 2 options (True, False), one correct.
- For single_choice: 3–5 options, exactly one correct.
- For multiple_choice: 3–5 options, 2 or more correct.
- Write clear, unambiguous questions. No trick wording.`,
                prompt: hasDocuments
                    ? `Document IDs to search: ${documentIds.join(', ')}\n\nBuild the quiz questions from this architecture:\n\n${architecture}`
                    : `Build the quiz questions from this architecture:\n\n${architecture}`,
            });

            const questionCount = output.questions.length;
            const typeCounts = output.questions.reduce<Record<string, number>>((acc, q) => {
                acc[q.questionType] = (acc[q.questionType] ?? 0) + 1;
                return acc;
            }, {});

            log.debug({
                attempt,
                durationMs: Date.now() - attemptStart,
                questionCount,
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
                questionCount,
                typeCounts,
                durationMs: Date.now() - attemptStart,
            }, 'Builder completed — draft saved');

            return inserted.id;

        } catch (err) {
            lastError = err;
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