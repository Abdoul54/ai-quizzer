import { tool } from 'ai';
import { z } from 'zod';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import logger from '@/lib/logger';

const toolLog = logger.child({ component: "tool", tool: "searchDocs" });

export async function searchDocsQuery({ query, documentIds }: { query: string; documentIds: string[] }): Promise<string> {
    if (!documentIds.length) {
        toolLog.warn({ query }, "searchDocs called with no documentIds");
        return 'RETRIEVAL_FAILED: No document IDs provided.';
    }

    const start = Date.now();

    try {
        const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: query,
        });

        // Build ARRAY[$1::uuid, $2::uuid, ...] — passing a JS array directly
        // produces ($1, $2, ...) which is invalid for ANY()
        const docIdsSql = sql.join(
            documentIds.map(id => sql`${id}::uuid`),
            sql`, `
        );

        const result = await db.execute(sql`
            SELECT dc.content, d.file_name
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.document_id = ANY(ARRAY[${docIdsSql}])
            ORDER BY dc.embedding <-> ${JSON.stringify(embedding)}::vector
            LIMIT 5
        `);

        if (!result.rows.length) {
            toolLog.warn({ query, documentIds, durationMs: Date.now() - start }, "searchDocs returned no results");
            return `RETRIEVAL_FAILED: No relevant content found for query: "${query}"`;
        }

        toolLog.debug({
            query,
            documentCount: documentIds.length,
            resultCount: result.rows.length,
            durationMs: Date.now() - start,
        }, "searchDocs completed");

        return result.rows
            .map(r => `[${r.file_name}]\n${r.content}`)
            .join('\n\n');

    } catch (err) {
        // Never include the embedding or raw SQL error in the returned string —
        // it ends up in message history and will blow the context window
        toolLog.error({ query, documentIds, durationMs: Date.now() - start, err }, "searchDocs query failed");
        return 'RETRIEVAL_FAILED: Search query failed. The documents may not be ready yet.';
    }
}

export const createSearchDocsTool = (documentIds: string[]) =>
    tool({
        description: 'Semantically searches the knowledge base for specific concepts or topics within the provided documents.',
        inputSchema: z.object({ query: z.string() }),
        execute: ({ query }) => searchDocsQuery({ query, documentIds }),
    });