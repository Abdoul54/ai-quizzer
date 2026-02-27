import { db } from "@/db";
import { quiz, draft } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { apiLogger } from "@/lib/logger";

const optionSchema = z.object({
    id: z.string(),
    optionText: z.string(),
    isCorrect: z.boolean(),
});

const questionSchema = z.object({
    id: z.string(),
    questionText: z.string(),
    questionType: z.enum(["true_false", "single_choice", "multiple_choice"]),
    options: z.array(optionSchema),
});

const patchSchema = z.discriminatedUnion("operation", [
    z.object({
        operation: z.literal("update_question"),
        questionId: z.string(),
        questionText: z.string().optional(),
        questionType: z.enum(["true_false", "single_choice", "multiple_choice"]).optional(),
    }),
    z.object({
        operation: z.literal("update_option"),
        questionId: z.string(),
        optionId: z.string(),
        optionText: z.string().optional(),
        isCorrect: z.boolean().optional(),
    }),
    z.object({
        operation: z.literal("add_question"),
        question: questionSchema.omit({ id: true }),
    }),
    z.object({
        operation: z.literal("delete_question"),
        questionId: z.string(),
    }),
    z.object({
        operation: z.literal("reorder_questions"),
        questionIds: z.array(z.string()),
    }),
    z.object({
        operation: z.literal("replace_options"),
        questionId: z.string(),
        options: z.array(z.object({
            optionText: z.string(),
            isCorrect: z.boolean(),
        })),
    }),
    z.object({
        operation: z.literal("add_option"),
        questionId: z.string(),
        option: z.object({
            optionText: z.string(),
            isCorrect: z.boolean(),
        }),
    }),
]);

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const log = apiLogger("/api/quizzes/[id]/draft PATCH", session.user.id);

    const quizExists = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
        columns: { id: true },
    });

    if (!quizExists) {
        log.warn({ quizId: id }, "Draft PATCH — quiz not found");
        return NextResponse.json({ error: "Quiz is not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
        log.warn({ quizId: id, errors: parsed.error.flatten() }, "Draft PATCH — validation failed");
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const op = parsed.data;
    log.info({ quizId: id, operation: op.operation }, "Draft PATCH started");

    const [current] = await db
        .select()
        .from(draft)
        .where(eq(draft.quizId, id))
        .orderBy(desc(draft.createdAt))
        .limit(1);

    if (!current) {
        log.warn({ quizId: id }, "Draft PATCH — no draft found");
        return Response.json({ error: "Draft not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions: z.infer<typeof questionSchema>[] = (current.content as any).questions;
    let updatedQuestions = [...questions];

    switch (op.operation) {
        case "update_question": {
            updatedQuestions = updatedQuestions.map(q =>
                q.id === op.questionId
                    ? {
                        ...q,
                        ...(op.questionText !== undefined && { questionText: op.questionText }),
                        ...(op.questionType !== undefined && { questionType: op.questionType }),
                    }
                    : q
            );
            break;
        }
        case "update_option": {
            updatedQuestions = updatedQuestions.map(q =>
                q.id === op.questionId
                    ? {
                        ...q,
                        options: q.options.map(o =>
                            o.id === op.optionId
                                ? {
                                    ...o,
                                    ...(op.optionText !== undefined && { optionText: op.optionText }),
                                    ...(op.isCorrect !== undefined && { isCorrect: op.isCorrect }),
                                }
                                : o
                        ),
                    }
                    : q
            );
            break;
        }
        case "add_question": {
            updatedQuestions.push({
                id: uuidv4(),
                ...op.question,
                options: op.question.options.map(o => {
                    const { id: _id, ...rest } = o as z.infer<typeof optionSchema>;
                    return { id: uuidv4(), ...rest };
                }),
            });
            break;
        }
        case "delete_question": {
            updatedQuestions = updatedQuestions.filter(q => q.id !== op.questionId);
            break;
        }
        case "reorder_questions": {
            const map = new Map(updatedQuestions.map(q => [q.id, q]));
            updatedQuestions = op.questionIds
                .map(qid => map.get(qid))
                .filter(Boolean) as typeof updatedQuestions;
            break;
        }
        case "replace_options": {
            updatedQuestions = updatedQuestions.map(q =>
                q.id === op.questionId
                    ? {
                        ...q,
                        options: op.options.map(o => ({
                            id: uuidv4(),
                            optionText: o.optionText,
                            isCorrect: o.isCorrect,
                        })),
                    }
                    : q
            );
            break;
        }
        case "add_option": {
            updatedQuestions = updatedQuestions.map(q =>
                q.id === op.questionId
                    ? {
                        ...q,
                        options: [
                            ...q.options,
                            { id: uuidv4(), optionText: op.option.optionText, isCorrect: op.option.isCorrect },
                        ],
                    }
                    : q
            );
            break;
        }
    }

    const [inserted] = await db
        .insert(draft)
        .values({ quizId: id, content: { questions: updatedQuestions } })
        .returning({ id: draft.id });

    log.info({ quizId: id, operation: op.operation, newDraftId: inserted.id }, "Draft PATCH complete");

    return Response.json({ id: inserted.id });
}