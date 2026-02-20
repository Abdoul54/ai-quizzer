import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { db } from "@/db";
import { documents, documentChunks } from "@/db/schema";
import { extractPdfText } from "@/lib/pdf";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const rawText = formData.get("text") as string | null;

        let text: string = rawText || "";

        if (file) {
            const uint8 = new Uint8Array(await file.arrayBuffer());
            const { text: extracted } = await extractPdfText(uint8);
            text = extracted;
        }

        if (!text || text.trim().length === 0) {
            return Response.json({ error: "No text extracted" }, { status: 400 });
        }

        // 1. insert parent document — scoped to the current user
        const [document] = await db
            .insert(documents)
            .values({
                userId: session.user.id,
                fileName: file?.name ?? "manual-text",
                fileType: file?.type ?? "text/plain",
            })
            .returning({ id: documents.id });

        // 2. embed and insert chunks linked to document
        const chunks = chunkText(text, 800);

        for (const chunk of chunks) {
            const { embedding } = await embed({
                model: openai.embedding("text-embedding-3-small"),
                value: chunk,
            });

            await db.insert(documentChunks).values({
                documentId: document.id,
                content: chunk,
                embedding,
            });
        }

        // 3. return the id
        return Response.json({ id: document.id, chunksStored: chunks.length });

    } catch (err) {
        console.error("UPLOAD CRASH:", err);
        return Response.json({ error: String(err) }, { status: 500 });
    }
}

function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
    const chunks: string[] = [];

    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const sentences = normalized.split(/(?<=[.?!])\s+|\n{2,}/);

    let current = '';

    for (const sentence of sentences) {
        if ((current + ' ' + sentence).trim().length <= chunkSize) {
            current = current ? `${current} ${sentence}` : sentence;
        } else {
            if (current) chunks.push(current.trim());

            const words = current.split(' ');
            const overlapText = words.slice(-Math.floor(overlap / 5)).join(' ');
            current = overlapText ? `${overlapText} ${sentence}` : sentence;
        }
    }

    if (current.trim()) chunks.push(current.trim());

    return chunks;
}