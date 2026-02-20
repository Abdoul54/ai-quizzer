import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { db } from '@/db';
import { draft } from '@/db/schema';

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
    architecture: string;
}

const MAX_ATTEMPTS = 3;

export const builder = async ({ quizId, architecture }: BuilderInput) => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const { output } = await generateText({
                model: openai(process.env.BUILDER || 'gpt-4o-mini'),
                output: quizOutputSchema,
                system: `You are a quiz question writer.
You receive a quiz architecture written by an instructional designer and must produce the exact questions and answer options it specifies.

RULES:
- Follow the architecture exactly: question count, types, difficulty, language, topic distribution.
- For true_false: exactly 2 options (True, False), one correct.
- For single_choice: 3–5 options, exactly one correct.
- For multiple_choice: 3–5 options, 2 or more correct.
- Write clear, unambiguous questions. No trick wording.`,
                prompt: `Build the quiz questions from this architecture:\n\n${architecture}`,
            });

            await db.insert(draft).values({ quizId, content: output });
            return;

        } catch (err) {
            lastError = err;
            console.warn(`Builder attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);

            if (attempt < MAX_ATTEMPTS) {
                // Exponential backoff: 1s, 2s
                await new Promise(res => setTimeout(res, 1000 * attempt));
            }
        }
    }

    throw new Error(
        `Builder failed after ${MAX_ATTEMPTS} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
};