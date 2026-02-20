import { tool } from "ai";
import { z } from "zod";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const searchDocs = tool({
    description: `
Search the knowledge base semantically.
Use this whenever user asks about documents,
files, knowledge base, or stored info.
`,
    inputSchema: z.object({
        query: z.string(),
        documentIds: z.array(z.string().uuid()),
    }),

    execute: async ({ query, documentIds }) => {
        console.log("TOOL searchDocs CALLED with:", query, documentIds);

        if (!documentIds.length) {
            return "No documents available to search.";
        }

        // 1. embed user query
        const { embedding } = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: query,
        });

        // 2. semantic search scoped to provided documentIds
        const result = await db.execute(sql`
            SELECT dc.content, d.file_name
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.document_id = ANY(${documentIds}::uuid[])
            ORDER BY dc.embedding <-> ${JSON.stringify(embedding)}::vector
            LIMIT 5
        `);

        if (!result.rows.length) {
            return "No relevant documents found.";
        }

        // 3. return context
        return result.rows
            .map(r => `[${r.file_name}]\n${r.content}`)
            .join("\n\n");
    },
});