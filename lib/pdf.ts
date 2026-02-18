// lib/pdf.ts
import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

export async function extractPdfText(buffer: Uint8Array): Promise<string> {
    const base64 = Buffer.from(buffer).toString("base64");

    const response = await client.ocr.process({
        model: "mistral-ocr-latest",
        document: {
            type: "document_url",
            documentUrl: `data:application/pdf;base64,${base64}`,
        },
    });

    return response.pages.map((p) => p.markdown).join("\n");
}