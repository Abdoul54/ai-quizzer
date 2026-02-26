import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { NextRequest } from "next/server";
import { distractionMinion, questionMinion, singleOptionMinion, typeMinion } from "@/agents/minions";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const improveSchema = z.discriminatedUnion("scope", [
    // Reword the question text for clarity — options untouched
    z.object({
        scope: z.literal("question_text"),
        question: z.object({
            questionText: z.string(),
            questionType: z.enum(["true_false", "single_choice", "multiple_choice"]),
            options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
        }),
    }),
    // Fix one specific option — never reveals or changes isCorrect
    z.object({
        scope: z.literal("single_option"),
        questionText: z.string(),
        option: z.object({ optionText: z.string(), isCorrect: z.boolean() }),
    }),
    // Convert between question types
    z.object({
        scope: z.literal("change_type"),
        question: z.object({
            questionText: z.string(),
            questionType: z.enum(["true_false", "single_choice", "multiple_choice"]),
            options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
        }),
        newType: z.enum(["true_false", "single_choice", "multiple_choice"]),
    }),
    // Generate a new plausible wrong option to add to the question
    z.object({
        scope: z.literal("add_distractor"),
        question: z.object({
            questionText: z.string(),
            questionType: z.enum(["single_choice", "multiple_choice"]),
            options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
        }),
    }),
]);

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = improveSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;

    // ── question_text ─────────────────────────────────────────────────────────
    if (data.scope === "question_text") {
        const object = await questionMinion(data)
        return Response.json(object);
    }

    // ── single_option ─────────────────────────────────────────────────────────
    if (data.scope === "single_option") {
        // Strip isCorrect — the AI has no business knowing which answer is correct
        const object = await singleOptionMinion(data)

        // isCorrect reattached from the original — never derived from AI output
        return Response.json({ optionText: object.optionText, isCorrect: data.option.isCorrect });
    }

    // ── change_type ───────────────────────────────────────────────────────────
    if (data.scope === "change_type") {
        const object = await typeMinion(data)

        return Response.json(enforceStructure(object, data.newType));
    }

    // ── add_distractor ────────────────────────────────────────────────────────
    if (data.scope === "add_distractor") {
        const object = await distractionMinion(data)

        // Always incorrect — it's a distractor by definition
        return Response.json({ optionText: object.optionText, isCorrect: false });
    }
}

// ─── Enforce Structure ────────────────────────────────────────────────────────

type Question = {
    questionText: string;
    questionType: "true_false" | "single_choice" | "multiple_choice";
    options: { optionText: string; isCorrect: boolean }[];
};

function enforceStructure(q: Question, newType: Question["questionType"]): Question {
    if (newType === "true_false") {
        const hadCorrect = q.options?.some(o => o.isCorrect);
        return {
            questionText: q.questionText,
            questionType: "true_false",
            options: [
                { optionText: "True", isCorrect: !!hadCorrect },
                { optionText: "False", isCorrect: !hadCorrect },
            ],
        };
    }

    if (newType === "single_choice") {
        let options = q.options?.slice(0, 5) || [];
        if (options.length < 3) {
            options.push(
                { optionText: "None of the above", isCorrect: false },
                { optionText: "All of the above", isCorrect: false }
            );
        }
        const correct = options.filter(o => o.isCorrect);
        if (correct.length !== 1) {
            options = options.map((o, i) => ({ ...o, isCorrect: i === 0 }));
        }
        return { questionText: q.questionText, questionType: "single_choice", options: options.slice(0, 5) };
    }

    if (newType === "multiple_choice") {
        let options = q.options?.slice(0, 5) || [];
        if (options.length < 3) {
            options.push(
                { optionText: "Option A", isCorrect: true },
                { optionText: "Option B", isCorrect: true },
                { optionText: "Option C", isCorrect: false }
            );
        }
        const correct = options.filter(o => o.isCorrect);
        if (correct.length < 2) {
            options = options.map((o, i) => ({ ...o, isCorrect: i < 2 }));
        }
        return { questionText: q.questionText, questionType: "multiple_choice", options: options.slice(0, 5) };
    }

    return q;
}