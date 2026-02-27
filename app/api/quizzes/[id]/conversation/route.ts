import { db } from "@/db";
import { quiz, conversations, message } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { editor } from "@/agents/editor";
import { NextRequest } from "next/server";
import { apiLogger } from "@/lib/logger";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const log = apiLogger("/api/quizzes/[id]/conversation POST", session.user.id);

    const { messages } = await req.json();

    const quizExists = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
        columns: { id: true, documentIds: true, architecture: true },
    });

    if (!quizExists) {
        log.warn({ quizId: id }, "Quiz not found for conversation");
        return Response.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Get or create conversation
    let conversation = await db.query.conversations.findFirst({
        where: eq(conversations.quizId, id),
    });

    if (!conversation) {
        const [created] = await db
            .insert(conversations)
            .values({ quizId: id })
            .returning();
        conversation = created;
        log.debug({ quizId: id, conversationId: created.id }, "Conversation created");
    }

    // Save the latest user message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMessage) {
        await db.insert(message).values({
            conversationId: conversation.id,
            role: "user",
            content: lastUserMessage.parts ?? lastUserMessage.content,
        });
    }

    log.info({
        quizId: id,
        conversationId: conversation.id,
        messageCount: messages.length,
        documentCount: quizExists.documentIds?.length ?? 0,
    }, "Editor conversation started");

    const stream = await editor({
        quizId: id,
        documentIds: quizExists.documentIds ?? [],
        architecture: quizExists.architecture ?? undefined,
        messages,
        onSave: async (text) => {
            await db.insert(message).values({
                conversationId: conversation!.id,
                role: "assistant",
                content: [{ type: "text", text }],
            });
            log.debug({ quizId: id, conversationId: conversation!.id }, "Assistant response saved");
        },
    });

    const result = stream.toUIMessageStreamResponse();

    // Save assistant response after streaming completes
    Promise.resolve(stream.consumeStream()).then(async () => {
        const text = await stream.text;
        if (text) {
            await db.insert(message).values({
                conversationId: conversation!.id,
                role: "assistant",
                content: [{ type: "text", text }],
            });
            log.debug({ quizId: id, conversationId: conversation!.id }, "Assistant response saved");
        }
    }).catch((err) => {
        log.error({ quizId: id, conversationId: conversation!.id, err }, "Failed to save assistant response");
    });

    return result;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.quizId, id),
        with: {
            messages: { orderBy: (m, { asc }) => [asc(m.createdAt)] },
            quiz: { columns: { title: true, defaultLanguage: true } },
        },
    });

    return Response.json(conversation ?? null);
}