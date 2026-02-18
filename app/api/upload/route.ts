import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { db } from "@/db";
import { documents, documentChunks } from "@/db/schema";
import { extractPdfText } from "@/lib/pdf";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const rawText = formData.get("text") as string | null;

        let text: string = rawText || "";

        if (file) {
            const uint8 = new Uint8Array(await file.arrayBuffer());
            text = await extractPdfText(uint8);
        }

        if (!text || text.trim().length === 0) {
            return Response.json({ error: "No text extracted" }, { status: 400 });
        }

        // 1. insert parent document
        const [document] = await db
            .insert(documents)
            .values({ fileName: file?.name ?? "manual-text" })
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

function chunkText(text: string, size: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + size));
        i += size;
    }
    return chunks;
}