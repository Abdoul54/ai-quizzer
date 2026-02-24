import { z } from "zod";
import { languageCodes } from "@/lib/languages";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const questionTypeSchema = z.enum(["true_false", "single_choice", "multiple_choice"]);
export const quizDifficultySchema = z.enum(["easy", "medium", "hard"]);
export const messageRoleSchema = z.enum(["user", "assistant", "tool"]);
export const languageSchema = z.enum(languageCodes);

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export const createQuizSchema = z.object({
    title: z.string().min(1, "Title is required").max(255),
    description: z.string().max(1000).optional(),
    topic: z.string().max(255).optional(),
    questionCount: z.number().int().min(1).max(100).optional(),
    difficulty: quizDifficultySchema.optional(),
    questionTypes: z.array(questionTypeSchema).optional(),
    defaultLanguage: languageSchema.optional(),
    languages: z.array(languageSchema).optional(),
    additionalPrompt: z.string().max(2000).optional(),
    documentIds: z.array(z.string()).optional(),
    architecture: z.string().optional(),
});

export const updateQuizSchema = createQuizSchema.partial();

// ─── Question ─────────────────────────────────────────────────────────────────

export const createQuestionSchema = z.object({
    quizId: z.string().uuid(),
    questionType: questionTypeSchema,
    questionText: z.string().min(1, "Question text is required"),
});

export const updateQuestionSchema = createQuestionSchema.partial().omit({ quizId: true });

// ─── Option ───────────────────────────────────────────────────────────────────

export const createOptionSchema = z.object({
    questionId: z.string().uuid(),
    optionText: z.string().min(1, "Option text is required"),
    isCorrect: z.boolean(),
});

export const updateOptionSchema = createOptionSchema.partial().omit({ questionId: true });

// ─── Conversation ─────────────────────────────────────────────────────────────

export const createConversationSchema = z.object({
    quizId: z.string().uuid(),
});

// ─── Message ──────────────────────────────────────────────────────────────────

export const createMessageSchema = z.object({
    conversationId: z.string().uuid(),
    role: messageRoleSchema,
    content: z.union([
        z.string(),
        z.array(
            z.union([
                z.object({ type: z.literal("text"), text: z.string() }),
                z.object({ type: z.literal("tool-call"), toolCallId: z.string(), toolName: z.string(), args: z.record(z.string(), z.unknown()) }),
                z.object({ type: z.literal("tool-result"), toolCallId: z.string(), toolName: z.string(), result: z.unknown() }),
            ])
        ),
    ]),
});

// ─── Params ───────────────────────────────────────────────────────────────────

export const uuidParamSchema = z.object({
    id: z.string().uuid("Invalid ID"),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

export type CreateOptionInput = z.infer<typeof createOptionSchema>;
export type UpdateOptionInput = z.infer<typeof updateOptionSchema>;

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;