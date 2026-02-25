import { db } from "@/db";
import { quiz } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const language = 'en'

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

    const quizInPreferedLang = {
        ...found,
        questions: found?.questions?.map(q => {
            const question = {
                ...q,
                questionText: (q?.questionText as Record<string, string> | undefined)?.[language],
                options: q?.options?.map(o => {
                    const option = {
                        ...o,
                        optionText: (o?.optionText as Record<string, string> | undefined)?.[language]
                    }
                    return option
                })
            }
            return question;
        })
    }

    return NextResponse.json(quizInPreferedLang);
}