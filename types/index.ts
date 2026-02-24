import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
    user,
    session,
    account,
    quiz,
    question,
    options,
    documents,
    documentChunks,
    conversations,
    message,
    draft,
} from "@/db/schema";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export type Session = InferSelectModel<typeof session>;
export type NewSession = InferInsertModel<typeof session>;

export type Account = InferSelectModel<typeof account>;
export type NewAccount = InferInsertModel<typeof account>;

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export type Quiz = InferSelectModel<typeof quiz>;
export type NewQuiz = InferInsertModel<typeof quiz>;

export type Question = InferSelectModel<typeof question>;
export type NewQuestion = InferInsertModel<typeof question>;

export type Option = InferSelectModel<typeof options>;
export type NewOption = InferInsertModel<typeof options>;

export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;

export type DocumentChunk = InferSelectModel<typeof documentChunks>;
export type NewDocumentChunk = InferInsertModel<typeof documentChunks>;

export type Conversation = InferSelectModel<typeof conversations>;
export type NewConversation = InferInsertModel<typeof conversations>;

export type Message = InferSelectModel<typeof message>;
export type NewMessage = InferInsertModel<typeof message>;

export type Draft = InferSelectModel<typeof draft>;


// ─── Nested / Relational ──────────────────────────────────────────────────────

export type OptionWithQuestion = Option & {
    question: Question;
};

export type QuestionWithOptions = Question & {
    options: Option[];
};

export type MessageWithConversation = Message & {
    conversation: Conversation;
};

export type ConversationWithMessages = {
    id: string;
    quizId: string;
    createdAt: Date;
    updatedAt: Date;
    quiz: {
        id: string;
        title: string;
    };
    messages: Message[];
};

export type QuizWithRelations = Quiz & {
    questions: QuestionWithOptions[];
    uploadedDocuments: Document[];
    conversations: ConversationWithMessages[];
};

export type DraftWithQuestions = Draft & {
    content: {
        questions: QuestionWithOptions[];
    };
};

// ─── API Payloads ─────────────────────────────────────────────────────────────

export type CreateQuizPayload = Pick<
    NewQuiz,
    | "title"
    | "description"
    | "topic"
    | "questionCount"
    | "difficulty"
    | "questionTypes"
    | "languages"
    | "additionalPrompt"
    | "architecture"
>;

export type UpdateQuizPayload = Partial<CreateQuizPayload>;

// ─── Enums ────────────────────────────────────────────────────────────────────

export type QuestionType = "true_false" | "single_choice" | "multiple_choice";
export type QuizDifficulty = "easy" | "medium" | "hard";
export type MessageRole = "user" | "assistant" | "tool";