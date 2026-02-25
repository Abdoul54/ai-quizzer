import { db } from "@/db";
import { quiz } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// ─── Shared helper ────────────────────────────────────────────────────────────

const resolveText = (raw: unknown, lang: string): string => {
    if (typeof raw === "string") return raw;
    const map = raw as Record<string, string> | undefined;
    return map?.[lang] ?? Object.values(map ?? {})[0] ?? "";
};

// ─── GET ──────────────────────────────────────────────────────────────────────
//
// Without ?lang=  →  returns only metadata (title, description, availableLanguages, defaultLanguage)
//                    used to render the language picker before the quiz starts
//
// With ?lang=XX   →  returns full quiz with questions in the requested language
//                    used once the user has picked a language and clicked Start

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const found = await db.query.quiz.findFirst({
        where: eq(quiz.id, id),
        with: {
            questions: {
                with: { options: true },
            },
        },
    });

    if (!found) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (found.status !== "published") return NextResponse.json({ error: "Quiz not available" }, { status: 403 });

    const defaultLanguage = found.defautltLanguage ?? "en";
    const availableLanguages: string[] = found.languages ?? [defaultLanguage];

    const requestedLang = req.nextUrl.searchParams.get("lang");

    // No lang param → return metadata only for the language picker
    if (!requestedLang) {
        return NextResponse.json({
            id: found.id,
            title: found.title,
            description: found.description,
            defaultLanguage,
            availableLanguages,
        });
    }

    // Validate the requested lang is actually available
    const language = availableLanguages.includes(requestedLang) ? requestedLang : defaultLanguage;

    // Return full quiz with questions in the requested language
    return NextResponse.json({
        id: found.id,
        title: found.title,
        description: found.description,
        language,
        defaultLanguage,
        availableLanguages,
        questions: found.questions.map((q) => ({
            id: q.id,
            questionType: q.questionType,
            questionText: resolveText(q.questionText, language),
            options: q.options.map((o) => ({
                id: o.id,
                optionText: resolveText(o.optionText, language),
                // isCorrect intentionally omitted
            })),
        })),
    });
}

// ─── POST — submit answers, receive grading ───────────────────────────────────

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const body = await req.json();
    const answers: Record<string, string[]> = body?.answers ?? {};

    const found = await db.query.quiz.findFirst({
        where: eq(quiz.id, id),
        with: {
            questions: {
                with: { options: true },
            },
        },
    });

    if (!found) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (found.status !== "published") return NextResponse.json({ error: "Quiz not available" }, { status: 403 });

    const results = found.questions.map((q) => {
        const submitted = answers[q.id] ?? [];
        const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);

        const isCorrect =
            correctOptionIds.length === submitted.length &&
            correctOptionIds.every((cid) => submitted.includes(cid));

        return {
            questionId: q.id,
            isCorrect,
            correctOptionIds,
            submittedOptionIds: submitted,
        };
    });

    return NextResponse.json({
        score: results.filter((r) => r.isCorrect).length,
        total: found.questions.length,
        results,
    });
}