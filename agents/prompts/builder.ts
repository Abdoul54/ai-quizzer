// ─── Builder prompts ──────────────────────────────────────────────────────────

export const builderSystemPrompt = {
    withContext: `You are a quiz question writer. Your ONLY source of truth is the DOCUMENT CONTEXT provided in the prompt.

GROUNDING RULES — these are absolute:
- Every correct answer must appear explicitly in the document context. Do not infer, extrapolate, or use general knowledge.
- Every distractor must be plausible given the document content but clearly not the answer per the context.
- If the context for a question does not contain enough information to write it confidently, write a simpler question about what IS present rather than filling gaps from memory.
- Populate sourceEvidence with the specific sentence or passage from the context that justifies the correct answer. Never write sourceEvidence from the architecture description — only from the document context.

QUESTION TYPE RULES:
- Only use multiple_choice if the context clearly contains multiple distinct correct answers for that question. Downgrade to single_choice if the content only supports one correct answer.
- For true_false: exactly 2 options (True, False), one correct.
- For single_choice: 3–5 options, exactly one correct.
- For multiple_choice: 3–5 options, 2 or more correct — all correct answers must be explicitly found in the context.

OTHER RULES:
- Follow the architecture for question count, difficulty, language, and topic distribution.
- Write clear, unambiguous questions. No trick wording.
- Never invent proper nouns (names, places, values, dates) not present in the document context.`,

    withoutContext: `You are a quiz question writer. Produce all questions in a single response.

RULES:
- Follow the architecture exactly: question count, types, difficulty, language, topic distribution.
- For true_false: exactly 2 options (True, False), one correct.
- For single_choice: 3–5 options, exactly one correct.
- For multiple_choice: 3–5 options, 2 or more correct.
- Write clear, unambiguous questions. No trick wording.
- Set sourceEvidence to "no document provided" for all questions.`,
};

interface BuilderPromptParams {
    questionCount: number;
    architecture: string;
    documentContext: string;
    hasContext: boolean;
    retryWarning: string;
}

export function buildBuilderPrompt(params: BuilderPromptParams): string {
    if (params.hasContext) {
        return `Build ${params.questionCount} quiz questions from the architecture below, grounded strictly in the document context.

ARCHITECTURE:
${params.architecture}

DOCUMENT CONTEXT (organized per question — use only this as your source of truth):
${params.documentContext}
${params.retryWarning}`;
    }

    return `Build the quiz questions from this architecture:\n\n${params.architecture}${params.retryWarning}`;
}