/* eslint-disable @typescript-eslint/no-explicit-any */
import { Mistral } from "@mistralai/mistralai";
import OpenAI from "openai";

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Strategy 1: Mistral OCR ──────────────────────────────────────────────────

async function extractWithMistralOCR(buffer: Uint8Array): Promise<string> {
    const base64 = Buffer.from(buffer).toString("base64");

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await mistral.ocr.process({
                model: "mistral-ocr-latest",
                document: {
                    type: "document_url",
                    documentUrl: `data:application/pdf;base64,${base64}`,
                },
            });
            return response.pages.map((p) => p.markdown).join("\n");
        } catch (err: any) {
            const isTransient = err?.statusCode >= 500 || err?.statusCode === 429;
            if (isTransient && attempt < MAX_RETRIES) {
                console.warn(`Mistral OCR attempt ${attempt + 1} failed (${err?.statusCode}), retrying...`);
                await sleep(RETRY_DELAY_MS * (attempt + 1));
                continue;
            }
            throw err;
        }
    }

    throw new Error("Mistral OCR failed after retries");
}

// ─── Strategy 2: GPT-4o Vision (native PDF support) ──────────────────────────

async function extractWithGPT4oVision(buffer: Uint8Array): Promise<string> {
    const base64 = Buffer.from(buffer).toString("base64");

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "file",
                        file: {
                            filename: "document.pdf",
                            file_data: `data:application/pdf;base64,${base64}`,
                        },
                    } as any,
                    {
                        type: "text",
                        text: "Extract all text from this document. Output only the extracted text, preserving structure. No commentary.",
                    },
                ],
            },
        ],
        max_tokens: 16384,
    });

    return response.choices[0]?.message?.content ?? "";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export type PdfExtractor = "mistral" | "gpt4o";

export async function extractPdfText(
    buffer: Uint8Array
): Promise<{ text: string; extractor: PdfExtractor }> {
    // 1. Try Mistral OCR
    try {
        const text = await extractWithMistralOCR(buffer);
        if (text.trim().length > 0) {
            return { text, extractor: "mistral" };
        }
        console.warn("Mistral OCR returned empty text, falling back to GPT-4o...");
    } catch (err) {
        console.warn("Mistral OCR failed, falling back to GPT-4o:", err);
    }

    // 2. Fallback: GPT-4o Vision
    const text = await extractWithGPT4oVision(buffer);
    if (text.trim().length === 0) {
        throw new Error("Both Mistral OCR and GPT-4o Vision returned empty text.");
    }

    return { text, extractor: "gpt4o" };
}