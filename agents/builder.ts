import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { db } from '@/db';
import { draft } from '@/db/schema';

const quizOutputSchema = z.object({
    questions: z.array(z.object({
        questionText: z.string(),
        questionType: z.enum(['true_false', 'single_choice', 'multiple_choice']),
        options: z.array(z.object({
            optionText: z.string(),
            isCorrect: z.boolean(),
        })),
    })),
});

interface BuilderInput {
    quizId: string;
    architecture: string;
}

export const builder = async ({ quizId, architecture }: BuilderInput) => {
    const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: quizOutputSchema,
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

    await db.insert(draft).values({
        quizId,
        content: object,
    });
};