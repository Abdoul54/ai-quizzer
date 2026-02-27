/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { draft, quiz, question, options } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { translator } from "@/agents/translator";
import { apiLogger } from "@/lib/logger";
import { LanguageCode } from "@/lib/languages";

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: quizId } = await params;
    const log = apiLogger("/api/quizzes/[id]/approve POST", session.user.id);

    log.info({ quizId }, "Quiz approval started");

    const quizExists = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, quizId), eq(quiz.userId, session.user.id)),
        columns: { id: true, defaultLanguage: true, languages: true },
    });

    if (!quizExists) {
        log.warn({ quizId }, "Quiz not found for approval");
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const defaultLang = quizExists.defaultLanguage as LanguageCode ?? 'en';
    const translationLangs = quizExists.languages || [];
    const langsToTranslate = translationLangs.filter(lang => lang !== defaultLang);

    log.info({ quizId, defaultLang, translationLangs, langsToTranslate }, "Languages resolved");

    // Fetch latest draft
    const latestDraft = await db.query.draft.findFirst({
        where: eq(draft.quizId, quizId),
        orderBy: [desc(draft.createdAt)],
    });

    if (!latestDraft) {
        log.warn({ quizId }, "No draft found for approval");
        return NextResponse.json({ error: "No draft found" }, { status: 404 });
    }

    const questions = (latestDraft.content as any).questions;
    log.debug({ quizId, questionCount: questions.length }, "Draft loaded");

    // Translate if additional languages requested
    let translations: any = null;
    if (langsToTranslate.length > 0) {
        log.info({ quizId, langsToTranslate }, "Translation started");
        const translationStart = Date.now();
        try {
            translations = await translator({ languages: langsToTranslate, draft: questions });
            log.info({
                quizId,
                langsToTranslate,
                durationMs: Date.now() - translationStart,
            }, "Translation completed");
        } catch (err) {
            log.error({ quizId, langsToTranslate, err }, "Translation failed");
            return NextResponse.json({ error: "Translation failed" }, { status: 500 });
        }
    } else {
        log.debug({ quizId }, "No additional languages — skipping translation");
    }

    // Transform draft questions into multilingual format
    const transformer = () => {
        return questions.map((q: any) => {
            const translation = translations?.questions?.find((t: any) => t?.id === q?.id);
            const questionText = (translation?.questionText as any[] || []).reduce<Record<string, string>>(
                (acc: Record<string, string>, item: any) => {
                    acc[item.lang] = item.text;
                    return acc;
                },
                {}
            );

            const newOptions = q?.options?.map((o: any) => {
                const optionTranslation = translation?.options?.find((t: any) => t?.id === o?.id);
                const optionText = (optionTranslation?.optionText as any[] || []).reduce<Record<string, string>>(
                    (acc: Record<string, string>, item: any) => {
                        acc[item.lang] = item.text;
                        return acc;
                    },
                    {}
                );
                return {
                    id: o?.id,
                    optionText: { [defaultLang]: o?.optionText, ...optionText },
                    isCorrect: o?.isCorrect,
                };
            });

            return {
                id: q?.id,
                questionType: q?.questionType,
                questionText: { [defaultLang]: q?.questionText, ...questionText },
                options: newOptions,
            };
        });
    };

    const transformedQuestions = transformer();
    log.debug({ quizId, questionCount: transformedQuestions.length }, "Questions transformed for publish");

    // Delete existing questions (cascade deletes options too)
    await db.delete(question).where(eq(question.quizId, quizId));

    // Insert new questions and options
    for (const q of transformedQuestions) {
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

    // Mark quiz as published
    await db.update(quiz).set({ status: "published" }).where(eq(quiz.id, quizId));

    log.info({ quizId, questionCount: transformedQuestions.length, languages: translationLangs }, "Quiz published");

    return NextResponse.json({ success: true });
}