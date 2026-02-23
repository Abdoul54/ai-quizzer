import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { NextRequest } from "next/server";

type Question = {
    questionText: string;
    questionType: "true_false" | "single_choice" | "multiple_choice";
    options: {
        optionText: string;
        isCorrect: boolean;
    }[];
};

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
        scope: z.literal("all_options"),
        question: z.object({
            questionText: z.string(),
            questionType: z.enum(["true_false", "single_choice", "multiple_choice"]),
            options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
        }),
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
]);

const questionTextSchema = z.object({ questionText: z.string() });
const singleOptionSchema = z.object({ optionText: z.string() });
const allOptionsSchema = z.object({
    options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
});
const changeTypeSchema = z.object({
    questionText: z.string(),
    questionType: z.enum(["true_false", "single_choice", "multiple_choice"]),
    options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
});
export async function POST(req: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = improveSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;

    if (data.scope === "question_text") {
        const { object } = await generateObject({
            model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
            schema: questionTextSchema,
            system: `You are a quiz question editor. Rewrite the question text to be clearer and more precise. Do not change the intent or difficulty.`,
            prompt: `Improve this question text:\n\n"${data.question.questionText}"\n\nContext - question type: ${data.question.questionType}, options: ${data.question.options.map(o => o.optionText).join(", ")}`,
        });
        return Response.json(object);
    }

    if (data.scope === "single_option") {
        const { object } = await generateObject({
            model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
            schema: singleOptionSchema,
            system: `You are a quiz question editor. Improve a single answer option to be clearer and more plausible. Do not change whether it is correct or incorrect.`,
            prompt: `Question: "${data.questionText}"\n\nImprove this option (isCorrect: ${data.option.isCorrect}):\n"${data.option.optionText}"`,
        });
        return Response.json(object);
    }

    if (data.scope === "all_options") {
        const { object } = await generateObject({
            model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
            schema: allOptionsSchema,
            system: `You are a quiz question editor. Improve all answer options to be clearer and more plausible. Keep the same number of options and do not change which ones are correct.`,
            prompt: `Question: "${data.question.questionText}"\n\nImprove these options:\n${JSON.stringify(data.question.options, null, 2)}`,
        });
        return Response.json(object);
    }
    if (data.scope === "change_type") {
        const { object } = await generateObject({
            model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
            schema: changeTypeSchema,
            system: `
You are an expert quiz editor that converts questions between types with strict structural rules.

You MUST transform both the question text AND options to correctly match the new type.
You are allowed to delete, rewrite, or regenerate options when required.

GENERAL RULES:
- Preserve the core topic and knowledge being tested.
- Improve clarity and quality.
- Ensure the final structure strictly matches the target type.
- Never keep options that don't fit the new type.

TYPE CONVERSION RULES:

IF new type = true_false:
- Completely discard existing options.
- Create exactly 2 options: "True" and "False".
- Only one must be correct.
- Rewrite the question into a clear factual statement that can be evaluated as true or false.
- Do NOT keep old options.

IF new type = single_choice:
- Create 3 to 5 options total.
- Exactly ONE option must be correct.
- If multiple answers were previously correct, select the best one and make others plausible distractors.
- Rewrite the question so it clearly asks for one correct answer.
- You may rewrite or regenerate all options.

IF new type = multiple_choice:
- Create 3 to 5 options total.
- At least TWO must be correct.
- Rewrite question to indicate multiple answers (e.g. "Which of the following...").
- Ensure distractors are plausible.
- You may rewrite or regenerate all options.

OUTPUT REQUIREMENTS:
- Return a fully valid question matching the requested type.
- Ensure options count and correctness strictly follow rules.
- Ensure wording naturally matches the new format.
`,
            prompt: `Convert this question from ${data.question.questionType} to ${data.newType}:\n\n${JSON.stringify(data.question, null, 2)}`,
        });

        const fixed = enforceStructure(object, data.newType);
        console.log("FINAL FIXED QUESTION:", fixed);
        return Response.json(fixed);
    }

}

function enforceStructure(
    q: Question,
    newType: "true_false" | "single_choice" | "multiple_choice"
): Question {    // ===== TRUE FALSE =====
    if (newType === "true_false") {
        // detect if statement is true based on previous correct answers
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

    // ===== SINGLE CHOICE =====
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
            // force exactly one correct
            options = options.map((o, i) => ({
                ...o,
                isCorrect: i === 0
            }));
        }

        return {
            questionText: q.questionText,
            questionType: "single_choice",
            options: options.slice(0, 5),
        };
    }

    // ===== MULTIPLE CHOICE =====
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
            // force at least 2 correct
            options = options.map((o, i) => ({
                ...o,
                isCorrect: i < 2
            }));
        }

        return {
            questionText: q.questionText,
            questionType: "multiple_choice",
            options: options.slice(0, 5),
        };
    }

    return q;
}