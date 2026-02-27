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

// ─── Minion (Draft Improvement) ───────────────────────────────────────────────

type QuestionType = "true_false" | "single_choice" | "multiple_choice";

interface MinionOption {
    optionText: string;
    isCorrect: boolean;
}

interface MinionQuestion {
    questionText: string;
    questionType: QuestionType;
    options: MinionOption[];
}

export type MinionJobData =
    | {
        scope: "question_text";
        quizId: string;
        question: MinionQuestion;
    }
    | {
        scope: "single_option";
        quizId: string;
        questionText: string;
        option: MinionOption;
    }
    | {
        scope: "change_type";
        quizId: string;
        question: MinionQuestion;
        newType: QuestionType;
    }
    | {
        scope: "add_distractor";
        quizId: string;
        question: {
            questionText: string;
            questionType: "single_choice" | "multiple_choice";
            options: MinionOption[];
        };
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