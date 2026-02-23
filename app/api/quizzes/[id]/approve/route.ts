/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { draft, quiz, question, options } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: quizId } = await params;

    const quizExists = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, quizId), eq(quiz.userId, session.user.id)),
        columns: { id: true },
    });

    if (!quizExists) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    // fetch latest draft
    const latestDraft = await db.query.draft.findFirst({
        where: eq(draft.quizId, quizId),
        orderBy: [desc(draft.createdAt)],
    });

    if (!latestDraft) return NextResponse.json({ error: "No draft found" }, { status: 404 });

    const questions = (latestDraft.content as any).questions;

    // delete existing questions (cascade deletes options too)
    await db.delete(question).where(eq(question.quizId, quizId));

    // insert new questions and options
    for (const q of questions) {
        const [inserted] = await db
            .insert(question)
            .values({
                id: q.id,
                quizId,
                questionType: q.questionType,
                questionText: q.questionText,
            })
            .returning({ id: question.id });

        await db.insert(options).values(
            q.options.map((o: any) => ({
                id: o.id,
                questionId: inserted.id,
                optionText: o.optionText,
                isCorrect: o.isCorrect,
            }))
        );
    }

    // mark quiz as published
    await db
        .update(quiz)
        .set({ status: "published" })
        .where(eq(quiz.id, quizId));

    return NextResponse.json({ success: true });
}