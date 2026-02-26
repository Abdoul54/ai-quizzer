import { generateText, Output, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db';
import { draft } from '@/db/schema';
import { searchDocs } from '@/lib/tools/search-docs';

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
    documentIds: string[]
}

const MAX_ATTEMPTS = 3;

export const builder = async ({ quizId, architecture, documentIds }: BuilderInput): Promise<string> => {
    let lastError: unknown;

    const hasDocuments = documentIds.length > 0;


    console.log("Building the quiz...")
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const { output } = await generateText({
                model: openai(process.env.BUILDER || 'gpt-4o-mini'),
                output: quizOutputSchema,
                tools: { searchDocs },
                stopWhen: stepCountIs(10),
                system: `You are a quiz question writer.
You receive a quiz architecture written by an instructional designer and must produce the exact questions and answer options it specifies.
${hasDocuments ? 'You have a searchDoc tool that enables you to search the documents' : ''}

RULES:
- Follow the architecture exactly: question count, types, difficulty, language, topic distribution.
${hasDocuments ? `
- If documentIds are provided you are obliged to search the docs to make the quiz based on them
- You have 10 steps max so always keep the last step for the response.
` : ""}
- For true_false: exactly 2 options (True, False), one correct.
- For single_choice: 3–5 options, exactly one correct.
- For multiple_choice: 3–5 options, 2 or more correct.
- Write clear, unambiguous questions. No trick wording.`,
                prompt: hasDocuments ? `Based on these documents ids: ${documentIds.join(', ')}, build the quiz questions from this architecture:\n\n${architecture}` :
                    `Build the quiz questions from this architecture:\n\n${architecture}`,
            });

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

            return inserted.id;

        } catch (err) {
            lastError = err;
            console.warn(`Builder attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);
            if (attempt < MAX_ATTEMPTS) {
                await new Promise(res => setTimeout(res, 1000 * attempt));
            }
        }
    }

    throw new Error(
        `Builder failed after ${MAX_ATTEMPTS} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
};