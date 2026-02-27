import { tool } from 'ai';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documentChunks, documents } from '@/db/schema';

export const getDocumentOverview = tool({
    description:
        'Fetches the first N chunks of each document in order to understand their structure and content. Always call this first before searching.',
    inputSchema: z.object({
        documentIds: z.array(z.string().uuid()),
        chunksPerDocument: z.number().default(15),
    }),
    execute: async ({ documentIds, chunksPerDocument }) => {
        if (!documentIds.length) {
            return 'RETRIEVAL_FAILED: No document IDs provided.';
        }

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

            allChunks.push(...result);
        }

        if (!allChunks.length) {
            return 'RETRIEVAL_FAILED: No chunks found for the provided document IDs. The documents may not have been processed yet.';
        }

        return allChunks
            .map(r => `[${r.fileName}]\n${r.content}`)
            .join('\n\n');
    },
});