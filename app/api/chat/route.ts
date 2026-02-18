import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { searchDocs } from "@/lib/tools/search-docs";

export async function POST(req: Request) {
    const { messages } = await req.json();

    const modelMessages = await convertToModelMessages(messages); // FIX

    const result = streamText({
        model: openai("gpt-4o-mini"),
        messages: modelMessages,

        tools: {
            searchDocs,
        },

        stopWhen: stepCountIs(5),
        toolChoice: "auto",

        system: `
You are an AI assistant connected to a document knowledge base.

CRITICAL RULES:

1. You MUST call the searchDocs tool for ANY question related to:
   - documents
   - pdfs
   - uploaded files
   - project info
   - MVP
   - anything that may exist in knowledge base

2. NEVER answer from your own knowledge if documents exist.
3. ALWAYS retrieve first using searchDocs.
4. If tool returns context → answer using ONLY that.
5. If nothing found → say "No info found in documents".

Do not skip retrieval.
`,
    });

    return result.toUIMessageStreamResponse();
}
