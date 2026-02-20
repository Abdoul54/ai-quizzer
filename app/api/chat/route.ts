import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { searchDocs } from "@/lib/tools/search-docs";
import { db } from "@/db";
import { quiz } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, quizId } = await req.json();

    // Fetch the quiz to get its scoped documentIds
    const found = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, quizId), eq(quiz.userId, session.user.id)),
        columns: { documentIds: true },
    });

    if (!found) {
        return Response.json({ error: "Quiz not found" }, { status: 404 });
    }

    const documentIds = found.documentIds ?? [];

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
        model: openai("gpt-4o-mini"),
        messages: modelMessages,
        tools: { searchDocs },
        stopWhen: stepCountIs(5),
        toolChoice: "auto",
        system: `
You are an AI assistant helping the user refine their quiz.
You have access to the documents this quiz was built from via the searchDocs tool.

RULES:
1. Always pass documentIds: ${JSON.stringify(documentIds)} to every searchDocs call.
2. For any question about the quiz content or source material, retrieve first using searchDocs.
3. If nothing is found in the documents, say so clearly.
4. Never answer from your own knowledge when documents are available.
`,
    });

    return result.toUIMessageStreamResponse();
}