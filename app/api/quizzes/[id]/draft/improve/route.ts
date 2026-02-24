import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { NextRequest } from "next/server";

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

const questionTextSchema = z.object({ questionText: z.string() });
const singleOptionSchema = z.object({ optionText: z.string() });
const changeTypeSchema = z.object({
    questionText: z.string(),
    questionType: z.enum(["true_false", "single_choice", "multiple_choice"]),
    options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
});
const addDistractorSchema = z.object({ optionText: z.string() });

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
        const { object } = await generateObject({
            model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
            schema: questionTextSchema,
            system: `You are a quiz question editor. Rewrite the question text to be clearer and more precise. Do not change the intent or difficulty.`,
            prompt: `Improve this question text:\n\n"${data.question.questionText}"\n\nContext — type: ${data.question.questionType}, options: ${data.question.options.map(o => o.optionText).join(", ")}`,
        });
        return Response.json(object);
    }

    // ── single_option ─────────────────────────────────────────────────────────
    if (data.scope === "single_option") {
        // Strip isCorrect — the AI has no business knowing which answer is correct
        const { object } = await generateObject({
            model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
            schema: singleOptionSchema,
            system: `You are a quiz question editor. Improve this answer option to be clearer and more plausible. Do not change its meaning.`,
            prompt: `Question: "${data.option.isCorrect
                ? "Improve this correct answer to be clear and precise."
                : "Improve this distractor to be plausible but clearly wrong."
                }"\n\nQuestion: "${data.questionText}"\nOption: "${data.option.optionText}"`,
        });
        // isCorrect reattached from the original — never derived from AI output
        return Response.json({ optionText: object.optionText, isCorrect: data.option.isCorrect });
    }

    // ── change_type ───────────────────────────────────────────────────────────
    if (data.scope === "change_type") {
        const { object } = await generateObject({
            model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
            schema: changeTypeSchema,
            system: `
You are an expert quiz editor that converts questions between types with strict structural rules.

TYPE CONVERSION RULES:

IF new type = true_false:
- Discard all existing options.
- Create exactly 2 options: "True" and "False", one correct.
- Rewrite the question as a clear factual statement.

IF new type = single_choice:
- Create 3–5 options total, exactly ONE correct.
- Rewrite question to ask for one answer.

IF new type = multiple_choice:
- Create 3–5 options total, at least TWO correct.
- Rewrite question to indicate multiple answers (e.g. "Which of the following...").`,
            prompt: `Convert this question from ${data.question.questionType} to ${data.newType}:\n\n${JSON.stringify(data.question, null, 2)}`,
        });

        return Response.json(enforceStructure(object, data.newType));
    }

    // ── add_distractor ────────────────────────────────────────────────────────
    if (data.scope === "add_distractor") {
        const existingOptions = data.question.options.map(o => o.optionText);

        const { object } = await generateObject({
            model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
            schema: addDistractorSchema,
            system: `You are a quiz question editor. Generate a single new plausible but incorrect answer option (distractor) for the given question. It must be clearly wrong but not obviously so. Do not duplicate any existing options.`,
            prompt: `Question: "${data.question.questionText}"\n\nExisting options:\n${existingOptions.map(o => `- ${o}`).join("\n")}\n\nGenerate one new distractor.`,
        });

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