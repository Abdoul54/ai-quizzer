import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { searchDocs } from "@/lib/tools/search-docs";
import { db } from "@/db";
import { quiz } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { retrieveQuizDraft } from "@/lib/tools/retrieve-quiz-draft";

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
        tools: { searchDocs, retrieveQuizDraft },
        stopWhen: stepCountIs(5),
        toolChoice: "auto",
        system: `
You are an AI assistant helping the user refine their quiz.
You have access to:
- The quiz draft (questions, options, structure) via the retrieveQuizDraft tool.
- The source documents the quiz was built from via the searchDocs tool.

RULES:
1. Whenever the user asks about the quiz questions, structure, or content — ALWAYS call retrieveQuizDraft(quizId: "${quizId}") first before responding.
2. When the user asks about source material or wants to verify accuracy, call searchDocs with documentIds: ${JSON.stringify(documentIds)}.
3. If nothing is found in the documents, say so clearly.
4. Never answer from your own knowledge when tools are available.
`,
    });

    return result.toUIMessageStreamResponse();
}