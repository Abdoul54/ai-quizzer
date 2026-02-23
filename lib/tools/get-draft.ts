import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { draft } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export const getDraft = tool({
    description: 'Fetches the current quiz draft. Always call this first before making any modifications.',
    inputSchema: z.object({
        quizId: z.string().uuid(),
    }),
    execute: async ({ quizId }) => {
        const [current] = await db
            .select()
            .from(draft)
            .where(eq(draft.quizId, quizId))
            .orderBy(desc(draft.createdAt))
            .limit(1);

        if (!current) return 'DRAFT_NOT_FOUND';

        return JSON.stringify(current.content);
    },
});