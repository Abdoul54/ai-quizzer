/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { draft, quiz, question, options } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/logger";
import { LanguageCode } from "@/lib/languages";

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });

    const { id: quizId } = await params;
    const log = apiLogger("/api/quizzes/[id]/approve POST", session.user.id);

    log.info({ quizId }, "Quiz approval started");

    const quizExists = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, quizId), eq(quiz.userId, session.user.id)),
        columns: { id: true, defaultLanguage: true },
    });

    if (!quizExists) {
        log.warn({ quizId }, "Quiz not found");
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const defaultLang = (quizExists.defaultLanguage as LanguageCode) ?? "en";

    const latestDraft = await db.query.draft.findFirst({
        where: eq(draft.quizId, quizId),
        orderBy: [desc(draft.createdAt)],
    });

    if (!latestDraft) {
        log.warn({ quizId }, "No draft found");
        return NextResponse.json({ error: "No draft found" }, { status: 404 });
    }

    const questions = (latestDraft.content as any).questions;

    // Delete existing questions and re-insert in multilingual format
    await db.delete(question).where(eq(question.quizId, quizId));

    for (const q of questions) {
        const [inserted] = await db
            .insert(question)
            .values({
                id: q.id,
                quizId,
                questionType: q.questionType,
                questionText: { [defaultLang]: q.questionText },
            })
            .returning({ id: question.id });

        if (q.options.length > 0) {
            await db.insert(options).values(
                q.options.map((o: any) => ({
                    id: o.id,
                    questionId: inserted.id,
                    optionText: { [defaultLang]: o.optionText },
                    isCorrect: o.isCorrect,
                }))
            );
        }
    }

    await db.update(quiz).set({ status: "published" }).where(eq(quiz.id, quizId));

    log.info({ quizId, questionCount: questions.length }, "Quiz published");
    return NextResponse.json({ success: true });
}