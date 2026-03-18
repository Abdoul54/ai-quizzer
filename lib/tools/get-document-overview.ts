import { tool } from 'ai';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import logger from '@/lib/logger';

const toolLog = logger.child({ component: "tool", tool: "getDocumentOverview" });

export const getDocumentOverview = tool({
    description:
        'Fetches the full content of each document to understand its structure and topics. Always call this first before writing the architecture.',
    inputSchema: z.object({
        documentIds: z.array(z.string().uuid()),
    }),
    execute: async ({ documentIds }) => {
        if (!documentIds.length) {
            toolLog.warn("getDocumentOverview called with no documentIds");
            return 'RETRIEVAL_FAILED: No document IDs provided.';
        }

        const start = Date.now();

        const results = await db
            .select({
                content: documents.content,
                fileName: documents.fileName,
            })
            .from(documents)
            .where(inArray(documents.id, documentIds));

        if (!results.length) {
            toolLog.warn({
                documentIds,
                durationMs: Date.now() - start,
            }, "getDocumentOverview returned no documents");
            return 'RETRIEVAL_FAILED: No documents found for the provided IDs.';
        }

        toolLog.debug({
            documentCount: results.length,
            totalChars: results.reduce((sum, r) => sum + r.content.length, 0),
            durationMs: Date.now() - start,
        }, "getDocumentOverview completed");

        return results
            .map(r => `[${r.fileName}]\n${r.content}`)
            .join('\n\n');
    },
});