import { tool } from 'ai';
import { z } from 'zod';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const searchDocs = tool({
    description:
        'Semantically searches the knowledge base for specific concepts or topics within the provided documents.',
    inputSchema: z.object({
        query: z.string(),
        documentIds: z.array(z.string().uuid()),
    }),
    execute: async ({ query, documentIds }) => {

        if (!documentIds.length) {
            return 'RETRIEVAL_FAILED: No document IDs provided.';
        }

        const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: query,
        });

        const result = await db.execute(sql`
            SELECT dc.content, d.file_name
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.document_id = ANY(${documentIds}::uuid[])
            ORDER BY dc.embedding <-> ${JSON.stringify(embedding)}::vector
            LIMIT 5
        `);

        if (!result.rows.length) {
            return `RETRIEVAL_FAILED: No relevant content found for query: "${query}"`;
        }

        return result.rows
            .map(r => `[${r.file_name}]\n${r.content}`)
            .join('\n\n');
    },
});