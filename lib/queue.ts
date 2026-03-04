import { Queue } from "bullmq";
import { redis } from "@/lib/redis";
import type { CreateQuizInput } from "@/lib/validators";

// ─── Quiz Generation ──────────────────────────────────────────────────────────

export interface QuizGenerationJobData {
    quizId: string;
    input: CreateQuizInput;
}

export const quizQueue = new Queue<QuizGenerationJobData>("quiz-generation", {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});

// ─── Minion ───────────────────────────────────────────────────────────────────

type QuestionType = "true_false" | "single_choice" | "multiple_choice";

interface MinionQuestion {
    questionText: string;
    questionType: QuestionType;
    options: { optionText: string; isCorrect: boolean }[];
}

export type MinionJobData =
    | {
        scope: "change_type";
        quizId: string;
        question: MinionQuestion;
        newType: QuestionType;
    }
    | {
        scope: "regenerate_question";
        quizId: string;
        question: MinionQuestion;
    }
    | {
        scope: "add_distractor";
        quizId: string;
        question: MinionQuestion;
    }
    | {
        scope: "add_question";
        quizId: string;
        existingQuestions: { questionText: string }[];
        questionType?: QuestionType;
    }
    | {
        scope: "custom_instruction";
        quizId: string;
        question: MinionQuestion;
        instruction: string;
    };

export const minionQueue = new Queue<MinionJobData>("minion-improvement", {
    connection: redis,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: 200,
        removeOnFail: 200,
    },
});