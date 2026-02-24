/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { draft } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const questionSchema = z.object({
    id: z.string().optional(),
    questionText: z.string(),
    questionType: z.enum(['true_false', 'single_choice', 'multiple_choice']),
    options: z.array(z.object({
        id: z.string().optional(),
        optionText: z.string(),
        isCorrect: z.boolean(),
    })),
});

export const updateDraft = tool({
    description: `Patches one or more questions in the draft. 
- To edit an existing question: include its "id" from the draft. Only the questions you pass are changed; all others remain untouched.
- To add a new question: omit the "id".
- To delete a question: pass its "id" and set "delete: true".
Never reconstruct the full questions array yourself.`,
    inputSchema: z.object({
        quizId: z.string().uuid(),
        changes: z.array(questionSchema.extend({
            delete: z.boolean().optional(),
        })),
    }),
    execute: async ({ quizId, changes }) => {
        // Load the latest draft
        const [current] = await db
            .select()
            .from(draft)
            .where(eq(draft.quizId, quizId))
            .orderBy(desc(draft.createdAt))
            .limit(1);

        if (!current) return 'DRAFT_NOT_FOUND';

        const existing = (current.content as { questions: any[] }).questions;

        // Apply patches
        let updated = existing
            .filter(q => {
                const change = changes.find(c => c.id === q.id);
                return !(change?.delete);
            })
            .map(q => {
                const change = changes.find(c => c.id === q.id);
                if (!change) return q;
                return {
                    ...q,
                    questionText: change.questionText,
                    questionType: change.questionType,
                    options: change.options.map(o => ({
                        id: o.id ?? uuidv4(),
                        optionText: o.optionText,
                        isCorrect: o.isCorrect,
                    })),
                };
            });

        // Append new questions (no id provided)
        const newQuestions = changes
            .filter(c => !c.id && !c.delete)
            .map(c => ({
                id: uuidv4(),
                questionText: c.questionText,
                questionType: c.questionType,
                options: c.options.map(o => ({
                    id: uuidv4(),
                    optionText: o.optionText,
                    isCorrect: o.isCorrect,
                })),
            }));

        updated = [...updated, ...newQuestions];

        await db.insert(draft).values({ quizId, content: { questions: updated } });

        return `DRAFT_UPDATED: ${changes.length} change(s) applied. Draft now has ${updated.length} questions.`;
    },
});