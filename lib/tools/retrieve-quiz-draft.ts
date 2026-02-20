import { tool } from "ai";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { draft } from "@/db/schema";

export const retrieveQuizDraft = tool({
    description: `
    This tool retrieves the latest quiz draft for a given quizId.
    It is used in the chat when the AI needs to reference the current quiz architecture.
    `,
    inputSchema: z.object({
        quizId: z.string().uuid(),
    }),
    execute: async ({ quizId }) => {
        const result = await db.query.draft.findFirst({
            where: eq(draft.quizId, quizId),
            orderBy: [desc(draft.createdAt)],
        });

        if (!result) {
            return "No draft found for this quiz.";
        }
        return result.content;
    }
});