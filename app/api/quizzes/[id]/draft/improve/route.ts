import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { minionQueue } from "@/lib/queue";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const improveSchema = z.discriminatedUnion("scope", [
    z.object({
        scope: z.literal("question_text"),
        question: z.object({
            questionText: z.string(),
            questionType: z.enum(["true_false", "single_choice", "multiple_choice"]),
            options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
        }),
    }),
    z.object({
        scope: z.literal("single_option"),
        questionText: z.string(),
        option: z.object({ optionText: z.string(), isCorrect: z.boolean() }),
    }),
    z.object({
        scope: z.literal("change_type"),
        question: z.object({
            questionText: z.string(),
            questionType: z.enum(["true_false", "single_choice", "multiple_choice"]),
            options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
        }),
        newType: z.enum(["true_false", "single_choice", "multiple_choice"]),
    }),
    z.object({
        scope: z.literal("add_distractor"),
        question: z.object({
            questionText: z.string(),
            questionType: z.enum(["single_choice", "multiple_choice"]),
            options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
        }),
    }),
]);

// ─── POST — enqueue job, return jobId immediately ─────────────────────────────

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: quizId } = await params;

    const body = await req.json();
    const parsed = improveSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const job = await minionQueue.add("improve", { quizId, ...parsed.data });

    return NextResponse.json({ jobId: job.id }, { status: 202 });
}