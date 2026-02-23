import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { draft } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

const questionSchema = z.object({
    id: z.string().optional(), // optional so the AI doesn't have to supply it
    questionText: z.string(),
    questionType: z.enum(['true_false', 'single_choice', 'multiple_choice']),
    options: z.array(z.object({
        id: z.string().optional(),
        optionText: z.string(),
        isCorrect: z.boolean(),
    })),
});

export const updateDraft = tool({
    description: 'Saves the modified quiz draft. Call this after applying all requested changes.',
    inputSchema: z.object({
        quizId: z.string().uuid(),
        questions: z.array(questionSchema),
    }),
    execute: async ({ quizId, questions }) => {
        // preserve existing IDs, generate new ones for anything missing
        const questionsWithIds = questions.map(q => ({
            ...q,
            id: q.id ?? uuidv4(),
            options: q.options.map(o => ({
                ...o,
                id: o.id ?? uuidv4(),
            })),
        }));

        await db
            .insert(draft)
            .values({ quizId, content: { questions: questionsWithIds } });

        return 'DRAFT_UPDATED';
    },
});