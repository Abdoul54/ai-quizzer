import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { db } from "@/db";
import { documents, documentChunks } from "@/db/schema";
import { extractText, isSupportedMimeType } from "@/lib/document-extractor";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { uploadLogger } from "@/lib/logger";
import { UPLOAD_MAX_FILE_SIZE_BYTES, UPLOAD_MAX_FILE_SIZE_LABEL } from "@/lib/constants";
import { uploadRateLimit } from "@/lib/rate-limit";

// Embed this many chunks in parallel at once
const EMBED_BATCH_SIZE = 10;

export async function POST(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const log = uploadLogger(session.user.id);

    // ── Rate limit ────────────────────────────────────────────────────────────
    const limited = await uploadRateLimit(session.user.id);
    if (limited) {
        log.warn("Upload rate limit exceeded");
        return limited;
    }

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
            if (file.size > UPLOAD_MAX_FILE_SIZE_BYTES) {
                log.warn({ fileName: file.name, fileSizeBytes: file.size }, "File exceeds size limit");
                return Response.json(
                    { error: `File is too large. Maximum allowed size is ${UPLOAD_MAX_FILE_SIZE_LABEL}.` },
                    { status: 413 },
                );
            }

            if (!isSupportedMimeType(file.type)) {
                log.warn({ fileName: file.name, fileType: file.type }, "Unsupported file type");
                return Response.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
            }

            const extractStart = Date.now();
            const uint8 = new Uint8Array(await file.arrayBuffer());
            const extracted = await extractText(uint8, file.type);
            text = extracted;
            log.debug({
                fileName: file.name,
                extractedLength: text.length,
                durationMs: Date.now() - extractStart,
            }, "Document text extracted");
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

        // 2. Chunk and embed in parallel batches
        const chunks = chunkText(text, 800);
        log.info({ documentId: document.id, chunkCount: chunks.length }, "Chunking complete, starting embeddings");

        const embedStart = Date.now();

        for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
            const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);

            const embeddings = await Promise.all(
                batch.map((chunk) =>
                    embed({
                        model: openai.embedding("text-embedding-3-small"),
                        value: chunk,
                    }).then((r) => r.embedding)
                )
            );

            await db.insert(documentChunks).values(
                batch.map((chunk, j) => ({
                    documentId: document.id,
                    content: chunk,
                    embedding: embeddings[j],
                }))
            );
        }

        log.info({
            documentId: document.id,
            fileName: file?.name ?? "manual-text",
            chunkCount: chunks.length,
            durationMs: Date.now() - embedStart,
        }, "Upload complete — all chunks embedded");

        // 3. Return
        return Response.json({ id: document.id, chunksStored: chunks.length });

    } catch (err) {
        log.error({ err }, "Upload failed");
        return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
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