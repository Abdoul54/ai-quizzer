import { tool } from 'ai';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documentChunks, documents } from '@/db/schema';
import logger from '@/lib/logger';

const toolLog = logger.child({ component: "tool", tool: "getDocumentOverview" });

export const getDocumentOverview = tool({
    description:
        'Fetches the first N chunks of each document in order to understand their structure and content. Always call this first before searching.',
    inputSchema: z.object({
        documentIds: z.array(z.string().uuid()),
        chunksPerDocument: z.number().default(15),
    }),
    execute: async ({ documentIds, chunksPerDocument }) => {
        if (!documentIds.length) {
            toolLog.warn("getDocumentOverview called with no documentIds");
            return 'RETRIEVAL_FAILED: No document IDs provided.';
        }

        const start = Date.now();
        const allChunks: { fileName: string; content: string }[] = [];

        for (const documentId of documentIds) {
            const result = await db
                .select({
                    content: documentChunks.content,
                    fileName: documents.fileName,
                })
                .from(documentChunks)
                .innerJoin(documents, eq(documentChunks.documentId, documents.id))
                .where(eq(documentChunks.documentId, documentId))
                .orderBy(documentChunks.createdAt)
                .limit(chunksPerDocument);

            toolLog.debug({
                documentId,
                chunksReturned: result.length,
                chunksRequested: chunksPerDocument,
            }, "Document overview fetched");

            allChunks.push(...result);
        }

        if (!allChunks.length) {
            toolLog.warn({
                documentIds,
                durationMs: Date.now() - start,
            }, "getDocumentOverview returned no chunks — documents may not be processed yet");
            return 'RETRIEVAL_FAILED: No chunks found for the provided document IDs. The documents may not have been processed yet.';
        }

        toolLog.debug({
            documentCount: documentIds.length,
            totalChunks: allChunks.length,
            durationMs: Date.now() - start,
        }, "getDocumentOverview completed");

        return allChunks
            .map(r => `[${r.fileName}]\n${r.content}`)
            .join('\n\n');
    },
});