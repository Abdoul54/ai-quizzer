import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { db } from '@/db';
import { draft } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

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

interface EditorInput {
    quizId: string;
    instruction: string;
}

const MAX_ATTEMPTS = 3;

export const editor = async ({ quizId, instruction }: EditorInput) => {
    // Fetch the latest draft to use as the base
    const latestDraft = await db.query.draft.findFirst({
        where: eq(draft.quizId, quizId),
        orderBy: [desc(draft.createdAt)],
    });

    if (!latestDraft) {
        throw new Error(`No draft found for quiz ${quizId}`);
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const { output } = await generateText({
                model: openai(process.env.EDITOR || 'gpt-4o-mini'),
                output: quizOutputSchema,
                system: `You are a quiz editor. You receive an existing quiz draft and a modification instruction from the user.
Your job is to apply the requested changes and return the full updated quiz.

RULES:
- Only modify what the instruction asks for. Leave everything else unchanged.
- For true_false: exactly 2 options (True, False), one correct.
- For single_choice: 3–5 options, exactly one correct.
- For multiple_choice: 3–5 options, 2 or more correct.
- Always return the complete list of questions, not just the changed ones.
- Write clear, unambiguous questions. No trick wording.`,
                prompt: `Current draft:
${JSON.stringify(latestDraft.content, null, 2)}

User instruction:
${instruction}

Apply the instruction and return the full updated quiz.`,
            });

            await db.insert(draft).values({ quizId, content: output });
            return output;

        } catch (err) {
            lastError = err;
            console.warn(`Editor attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);

            if (attempt < MAX_ATTEMPTS) {
                await new Promise(res => setTimeout(res, 1000 * attempt));
            }
        }
    }

    throw new Error(
        `Editor failed after ${MAX_ATTEMPTS} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
};