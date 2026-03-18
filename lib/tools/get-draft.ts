import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { draft } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import logger from '@/lib/logger';

const toolLog = logger.child({ component: "tool", tool: "getDraft" });

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

        if (!current) {
            toolLog.warn({ quizId }, "getDraft — no draft found");
            return 'DRAFT_NOT_FOUND';
        }

        const content = current.content as { questions?: unknown[] } | null | undefined;
        const questionCount = content?.questions?.length ?? 0;

        toolLog.debug({ quizId, draftId: current.id, questionCount }, "getDraft completed");

        return { questions: content?.questions, number_of_questions: questionCount };
    },
});