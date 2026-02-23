import { convertToModelMessages, streamText, stepCountIs, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDraft } from '@/lib/tools/get-draft';
import { updateDraft } from '@/lib/tools/update-draft';

interface EditorInput {
    quizId: string;
    messages?: UIMessage[];
}

export const editor = async ({ quizId, messages }: EditorInput) => {
    const modelMessages = await convertToModelMessages(messages ?? []);

    return streamText({
        model: openai(process.env.QUIZ_EDITOR || 'gpt-4o-mini'),
        stopWhen: stepCountIs(4),
        toolChoice: 'auto',
        tools: { getDraft, updateDraft },
        system: `You are a quiz editor assistant. You help users modify their quiz questions through conversation.

WORKFLOW:
1. Call getDraft with the quizId to read the current questions.
2. Apply ONLY the changes the user requested. Leave everything else untouched.
3. Call updateDraft with the full modified questions array.
4. Confirm what you changed in a short, clear message.

RULES:
- Never modify questions the user didn't mention.
- For true_false: exactly 2 options (True, False), one correct.
- For single_choice: 3–5 options, exactly one correct.
- For multiple_choice: 3–5 options, 2 or more correct.
- If the user's request is ambiguous, ask for clarification before calling updateDraft.
- If getDraft returns DRAFT_NOT_FOUND, tell the user the quiz draft doesn't exist yet.

CRITICAL: When calling updateDraft, you MUST include ALL questions from the draft without exception.
The questions array you send completely replaces the existing draft.
Count the questions in the draft before calling updateDraft and verify your array has the exact same count.
Omitting questions is permanent data loss.`,
        messages: [
            { role: 'system', content: `The quizId you must use for all tool calls is: ${quizId}` },
            ...modelMessages,
        ],
    });
};