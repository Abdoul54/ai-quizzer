/* eslint-disable @typescript-eslint/no-explicit-any */
import { openai } from "@ai-sdk/openai";
import { generateText, Output, stepCountIs } from "ai";
import { searchDocs } from "@/lib/tools/search-docs";
import z from "zod";
import { trackUsage } from "@/lib/lib/track-usage";

// ─── Shared schema ────────────────────────────────────────────────────────────

const fullQuestionSchema = Output.object({
    schema: z.object({
        questionText: z.string(),
        questionType: z.enum(["true_false", "single_choice", "multiple_choice"]),
        options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })),
    }),
});

const addDistractorSchema = Output.object({
    schema: z.object({
        optionText: z.string(),
    }),
});

// ─── Architecture context ─────────────────────────────────────────────────────

function architectureContext(architecture?: string): string {
    if (!architecture) return "";
    return `\n\nQUIZ ARCHITECTURE (stay consistent with the quiz's topic, difficulty, language, and learning objectives):\n${architecture}`;
}

// ─── Structural rules (injected into every full-question minion) ──────────────

const STRUCTURAL_RULES = `
STRUCTURAL RULES (always enforce):
- true_false: exactly 2 options ("True" and "False"), one correct.
- single_choice: 3–5 options, exactly ONE correct. Distractors must be plausible.
- multiple_choice: 3–5 options, at least TWO correct. Distractors must be plausible.`;

// ─── Minions ──────────────────────────────────────────────────────────────────

/**
 * Changes the question type and rewrites the question + options to match.
 */
export const typeMinion = async (data: any) => {
    const { output } = await generateText({
        model: openai(process.env.MINIONS || "gpt-4o-mini"),
        output: fullQuestionSchema,
        onFinish: async ({ usage }) => {
            await trackUsage({
                userId: data.userId,
                quizId: data.quizId,
                source: "minion_change_type",
                model: process.env.MINIONS || "gpt-4o-mini",
                inputTokens: usage?.inputTokens,
                outputTokens: usage?.outputTokens,
            });
        },
        system: `You are an expert quiz editor. Convert a question to a new type, rewriting the question text and options so the question still makes sense and tests the same concept.${architectureContext(data.architecture)}
${STRUCTURAL_RULES}`,
        prompt: `Convert this question to type "${data.newType}".

Question: "${data.question.questionText}"
Current type: ${data.question.questionType}
Options: ${JSON.stringify(data.question.options)}`,
    });
    return output;
};

/**
 * Completely rewrites the question from scratch on a different angle of the same topic.
 * If documents are available, searches for source material to ground the new question.
 */
export const regenerateQuestionMinion = async (data: any) => {
    const hasDocuments = (data.documentIds ?? []).length > 0;

    const { output } = await generateText({
        model: openai(process.env.MINIONS || "gpt-4o-mini"),
        output: fullQuestionSchema,
        tools: hasDocuments ? { searchDocs } : undefined,
        stopWhen: stepCountIs(3),
        onFinish: async ({ usage }) => {
            await trackUsage({
                userId: data.userId,
                quizId: data.quizId,
                source: "minion_regenerate",
                model: process.env.MINIONS || "gpt-4o-mini",
                inputTokens: usage?.inputTokens,
                outputTokens: usage?.outputTokens,
            });
        },
        system: `You are an expert quiz question writer. Your job is to write a brand new question on the same topic and at the same difficulty level as the original — but testing a DIFFERENT aspect, fact, or angle. The result must feel like a distinct question, not a rephrasing.${architectureContext(data.architecture)}
${STRUCTURAL_RULES}

${hasDocuments ? `WORKFLOW:
1. Call searchDocs targeting a different angle of the same topic — NOT the same fact the original question tests.
2. Use the retrieved content to write a new, factually grounded question.

` : ""}STRICT RULES:
- Do NOT reuse the original question text, even partially.
- Do NOT reuse any of the original options, even partially.
- Do NOT ask about the same specific fact the original question tests.
- Pick a related but different sub-topic or angle within the same subject area.
${hasDocuments ? "- Base the question ONLY on facts present in the retrieved source material." : ""}`,
        prompt: `Write a new question on the same topic as this one, but testing a different angle.

Original question (do NOT rephrase or reuse): "${data.question.questionText}"
Type: ${data.question.questionType}
Original options (do NOT reuse): ${JSON.stringify(data.question.options)}
${hasDocuments ? `\nDocumentIds to search: [${data.documentIds.join(", ")}]` : ""}`,
    });
    return output;
};

/**
 * Generates one new plausible but incorrect distractor option.
 */
export const distractorMinion = async (data: any) => {
    const { output } = await generateText({
        model: openai(process.env.MINIONS || "gpt-4o-mini"),
        output: addDistractorSchema,
        onFinish: async ({ usage }) => {
            await trackUsage({
                userId: data.userId,
                quizId: data.quizId,
                source: "minion_add_distractor",
                model: process.env.MINIONS || "gpt-4o-mini",
                inputTokens: usage?.inputTokens,
                outputTokens: usage?.outputTokens,
            });
        },
        system: `You are a quiz question editor. Generate one new distractor option for the given question. It must be plausible but clearly incorrect, and must not duplicate any existing option.${architectureContext(data.architecture)}`,
        prompt: `Question: "${data.question.questionText}"
Existing options: ${data.question.options.map((o: any) => o.optionText).join(", ")}

Generate one new distractor.`,
    });
    return output;
};

/**
 * Generates a brand new question grounded in source documents.
 * When documents are available, the minion calls searchDocs itself,
 * deciding what topic to search for based on gaps in existing questions.
 */
export const addQuestionMinion = async (data: any) => {
    const existingQuestions = (data.existingQuestions ?? [])
        .map((q: any, i: number) => `${i + 1}. "${q.questionText}"`)
        .join("\n");

    const hasDocuments = (data.documentIds ?? []).length > 0;

    const { output } = await generateText({
        model: openai(process.env.MINIONS || "gpt-4o-mini"),
        output: fullQuestionSchema,
        tools: hasDocuments ? { searchDocs } : undefined,
        stopWhen: stepCountIs(3),
        onFinish: async ({ usage }) => {
            await trackUsage({
                userId: data.userId,
                quizId: data.quizId,
                source: "minion_add_question",
                model: process.env.MINIONS || "gpt-4o-mini",
                inputTokens: usage?.inputTokens,
                outputTokens: usage?.outputTokens,
            });
        },
        system: `You are an expert quiz question writer. Generate a brand new question that fits naturally into the existing quiz.${architectureContext(data.architecture)}
${STRUCTURAL_RULES}

${hasDocuments ? `WORKFLOW:
1. Call searchDocs with a query that targets a topic NOT yet covered by the existing questions. Use the documentIds from the prompt.
2. Use the retrieved content to write a factually grounded question.

` : ""}STRICT RULES:
- Do NOT duplicate or closely paraphrase any existing question.
- Do NOT test the same specific fact as any existing question.
- Match the language, difficulty, and topic distribution of the quiz.
- If a preferred question type is provided, use it. Otherwise choose the most appropriate type.
${hasDocuments ? "- Base the question ONLY on facts present in the retrieved source material." : ""}`,
        prompt: `Generate a new question for this quiz.

Existing questions (do NOT duplicate):\n${existingQuestions || "None yet."}
${hasDocuments ? `\nDocumentIds to search: [${data.documentIds.join(", ")}]` : ""}${data.questionType ? `\n\nPreferred type: ${data.questionType}` : ""}`,
    });
    return output;
};


export const customInstructionMinion = async (data: any) => {
    const { output } = await generateText({
        model: openai(process.env.MINIONS || "gpt-4o-mini"),
        output: fullQuestionSchema,
        onFinish: async ({ usage }) => {
            await trackUsage({
                userId: data.userId,
                quizId: data.quizId,
                source: "minion_custom_instruction",
                model: process.env.MINIONS || "gpt-4o-mini",
                inputTokens: usage?.inputTokens,
                outputTokens: usage?.outputTokens,
            });
        },
        system: `You are an expert quiz editor. Apply the user's instruction to the question. Change only what the instruction asks for — keep everything else the same.${architectureContext(data.architecture)}
${STRUCTURAL_RULES}`,
        prompt: `Instruction: "${data.instruction}"

Question: "${data.question.questionText}"
Type: ${data.question.questionType}
Options: ${JSON.stringify(data.question.options)}`,
    });
    return output;
};