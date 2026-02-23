import { languageCodes } from "@/lib/languages";
import { relations } from "drizzle-orm";
import {
    pgTable,
    text,
    timestamp,
    uuid,
    vector,
    boolean,
    index,
    pgEnum,
    integer,
    jsonb,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const languageEnum = pgEnum("language", languageCodes);
export const questionTypeEnum = pgEnum("question_type", ["true_false", "single_choice", "multiple_choice"]);
export const quizDifficultyEnum = pgEnum("quiz_difficulty", ["easy", "medium", "hard"]);
export const quizStatusEnum = pgEnum("quiz_status", ["draft", "published", "archived"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "tool"]);


/*==================================
    AUTH SCHEMA
===================================*/

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    language: languageEnum("language").notNull().default("en"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const session = pgTable(
    "session",
    {
        id: text("id").primaryKey(),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
    },
    (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
    "account",
    {
        id: text("id").primaryKey(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
    "verification",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
    quizzes: many(quiz),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));


/*==================================
    QUIZ SCHEMA
===================================*/

export const quiz = pgTable("quiz", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    topic: text("topic"),
    questionCount: integer("question_count"),
    difficulty: quizDifficultyEnum("difficulty"),
    status: quizStatusEnum("status").default("draft").notNull(),
    questionTypes: questionTypeEnum("question_types").array().default([]),
    language: languageEnum("language").default("en"),
    additionalPrompt: text("additional_prompt"),
    architecture: text("architecture"),
    documentIds: uuid("document_ids").array().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const draft = pgTable("draft", {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
        .notNull()
        .references(() => quiz.id, { onDelete: "cascade" }),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
}, (table) => [
    index("draft_quizId_idx").on(table.quizId),
]);

export const question = pgTable("question", {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
        .notNull()
        .references(() => quiz.id, { onDelete: "cascade" }),
    questionType: questionTypeEnum("question_type").notNull(),
    questionText: text("question_text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const options = pgTable("options", {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
        .notNull()
        .references(() => question.id, { onDelete: "cascade" }),
    optionText: text("option_text").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const documents = pgTable("documents", {
    id: uuid("id").defaultRandom().primaryKey(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    content: text("content").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
});

export const documentChunks = pgTable("document_chunks", {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
        .references(() => documents.id, { onDelete: "cascade" })
        .notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
        .notNull()
        .references(() => quiz.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

// jsonb content to support text, tool calls, and tool results (Vercel AI SDK CoreMessage shape)
export const message = pgTable("message", {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
        .notNull()
        .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

// ─── Quiz Relations ───────────────────────────────────────────────────────────

export const quizRelations = relations(quiz, ({ one, many }) => ({
    user: one(user, { fields: [quiz.userId], references: [user.id] }),
    questions: many(question),
    conversations: many(conversations),
    drafts: many(draft),
}));

export const questionRelations = relations(question, ({ one, many }) => ({
    quiz: one(quiz, {
        fields: [question.quizId],
        references: [quiz.id],
    }),
    options: many(options),
}));

export const optionsRelations = relations(options, ({ one }) => ({
    question: one(question, {
        fields: [options.questionId],
        references: [question.id],
    }),
}));

export const documentsRelations = relations(documents, ({ many }) => ({
    chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
    document: one(documents, {
        fields: [documentChunks.documentId],
        references: [documents.id],
    }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
    quiz: one(quiz, {
        fields: [conversations.quizId],
        references: [quiz.id],
    }),
    messages: many(message),
}));

export const messageRelations = relations(message, ({ one }) => ({
    conversation: one(conversations, {
        fields: [message.conversationId],
        references: [conversations.id],
    }),
}));

export const draftRelations = relations(draft, ({ one }) => ({
    quiz: one(quiz, { fields: [draft.quizId], references: [quiz.id] }),
}));