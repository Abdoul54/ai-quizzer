import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { db } from "@/db";
import { documents, documentChunks } from "@/db/schema";
import { extractPdfText } from "@/lib/pdf";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { uploadLogger } from "@/lib/logger";

export async function POST(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const log = uploadLogger(session.user.id);

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const rawText = formData.get("text") as string | null;

        log.info({
            hasFile: !!file,
            fileName: file?.name,
            fileType: file?.type,
            fileSizeBytes: file?.size,
            hasRawText: !!rawText,
        }, "Upload started");

        let text: string = rawText || "";

        if (file) {
            const extractStart = Date.now();
            const uint8 = new Uint8Array(await file.arrayBuffer());
            const { text: extracted } = await extractPdfText(uint8);
            text = extracted;
            log.debug({
                fileName: file.name,
                extractedLength: text.length,
                durationMs: Date.now() - extractStart,
            }, "PDF text extracted");
        }

        if (!text || text.trim().length === 0) {
            log.warn({ fileName: file?.name }, "No text extracted from upload");
            return Response.json({ error: "No text extracted" }, { status: 400 });
        }

        // 1. Insert parent document
        const [document] = await db
            .insert(documents)
            .values({
                userId: session.user.id,
                fileName: file?.name ?? "manual-text",
                fileType: file?.type ?? "text/plain",
                content: text,
            })
            .returning({ id: documents.id });

        log.debug({ documentId: document.id }, "Document record created");

        // 2. Chunk and embed
        const chunks = chunkText(text, 800);
        log.info({ documentId: document.id, chunkCount: chunks.length }, "Chunking complete, starting embeddings");

        const embedStart = Date.now();
        let embeddedCount = 0;

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

            embeddedCount++;
        }

        log.info({
            documentId: document.id,
            fileName: file?.name ?? "manual-text",
            chunkCount: chunks.length,
            embeddedCount,
            durationMs: Date.now() - embedStart,
        }, "Upload complete — all chunks embedded");

        // 3. Return
        return Response.json({ id: document.id, chunksStored: chunks.length });

    } catch (err) {
        log.error({ err }, "Upload failed");
        return Response.json({ error: String(err) }, { status: 500 });
    }
}

function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
    const chunks: string[] = [];

    const normalized = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n');

    const words = normalized.split(/(\s+)/);
    let current = '';

    for (const word of words) {
        if ((current + word).length <= chunkSize) {
            current += word;
        } else {
            if (current.trim()) {
                chunks.push(current.trim());
            }
            current = current.slice(-overlap) + word;
        }
    }

    if (current.trim()) {
        chunks.push(current.trim());
    }

    return chunks;
}