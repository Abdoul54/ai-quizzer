/* eslint-disable @typescript-eslint/no-explicit-any */
import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import z from "zod";

const questionTextSchema = Output.object({
    schema: z.object({
        questionText: z.string()
    })
});

const singleOptionSchema = Output.object({
    schema: z.object({
        optionText: z.string()
    })
})

const changeTypeSchema = Output.object({
    schema: z.object({
        questionText: z.string(),
        questionType: z.enum(["true_false", "single_choice", "multiple_choice"]),
        options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
    })
})

const addDistractorSchema = Output.object({
    schema: z.object({
        optionText: z.string()
    })
})


export const questionMinion = async (data: any) => {
    const { output } = await generateText({
        model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
        output: questionTextSchema,
        system: `You are a quiz question editor. Rewrite the question text to be clearer and more precise. Do not change the intent or difficulty.`,
        prompt: `Improve this question text:\n\n"${data.question.questionText}"\n\nContext — type: ${data.question.questionType}, options: ${data.question.options.map((o: any) => o.optionText).join(", ")}`,
    });

    return output
}


export const singleOptionMinion = async (data: any) => {
    const { output } = await generateText({
        model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
        output: singleOptionSchema,
        system: `You are a quiz question editor. Improve this answer option to be clearer and more plausible. Do not change its meaning.`,
        prompt: `Question: "${data.option.isCorrect
            ? "Improve this correct answer to be clear and precise."
            : "Improve this distractor to be plausible but clearly wrong."
            }"\n\nQuestion: "${data.questionText}"\nOption: "${data.option.optionText}"`,
    });

    return output
}

export const typeMinion = async (data: any) => {
    const { output } = await generateText({
        model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
        output: changeTypeSchema,
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

    return output
}

export const distractionMinion = async (data: any) => {
    const existingOptions = data.question.options.map((o: any) => o.optionText);

    const { output } = await generateText({
        model: openai(process.env.QUIZ_EDITOR || "gpt-4o-mini"),
        output: addDistractorSchema,
        system: `You are a quiz question editor. Generate a single new plausible but incorrect answer option (distractor) for the given question. It must be clearly wrong but not obviously so. Do not duplicate any existing options.`,
        prompt: `Question: "${data.question.questionText}"\n\nExisting options:\n${existingOptions.map((o: any) => `- ${o}`).join("\n")}\n\nGenerate one new distractor.`,
    });

    return output
}
