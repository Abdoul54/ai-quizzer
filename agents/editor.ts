import { convertToModelMessages, streamText, stepCountIs, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDraft } from '@/lib/tools/get-draft';
import { updateDraft } from '@/lib/tools/update-draft';
import { searchDocs } from '@/lib/tools/search-docs';

interface EditorInput {
    quizId: string;
    documentIds?: string[];
    architecture?: string;
    messages?: UIMessage[];
}

export const editor = async ({ quizId, documentIds = [], architecture, messages }: EditorInput) => {
    const modelMessages = await convertToModelMessages(messages ?? []);
    const hasDocuments = documentIds.length > 0;
    const hasArchitecture = !!architecture;

    return streamText({
        model: openai(process.env.QUIZ_EDITOR || 'gpt-4o-mini'),
        stopWhen: stepCountIs(6),
        toolChoice: 'auto',
        tools: { getDraft, updateDraft, searchDocs },
        system: `You are a quiz editor assistant. You help users modify their quiz questions through conversation.

TOOLS:
- getDraft: reads the current questions (always call this first)
- updateDraft: patches specific questions — pass only what changes, server handles the merge
${hasDocuments ? '- searchDocs: searches source documents for facts or new content' : ''}

WORKFLOW:
1. Call getDraft to read the current questions and their IDs.
${hasDocuments ? '2. If the request involves facts or adding new content, call searchDocs first.' : ''}
${hasDocuments ? '3.' : '2.'} Call updateDraft with ONLY the questions that need to change, using their IDs from the draft.
${hasDocuments ? '4.' : '3.'} Confirm what changed in a short message.

RULES:
- Always pass the question "id" from the draft when editing — this is how the server knows which question to replace.
- Never rewrite questions the user didn't mention.
- For true_false: exactly 2 options (True, False), one correct.
- For single_choice: 3–5 options, exactly one correct.
- For multiple_choice: 3–5 options, 2 or more correct.
- If the request is ambiguous, ask for clarification before calling updateDraft.
- If getDraft returns DRAFT_NOT_FOUND, tell the user the draft doesn't exist yet.
${hasArchitecture ? '- Stay consistent with the quiz architecture below. Respect its topic distribution, difficulty level, language, and learning objectives when editing or adding questions.' : ''}`,
        messages: [
            {
                role: 'system',
                content: [
                    `The quizId you must use for all tool calls is: ${quizId}`,
                    hasDocuments
                        ? `The documentIds to use when calling searchDocs are: [${documentIds.map(id => `"${id}"`).join(', ')}]`
                        : 'No source documents are linked to this quiz. Do not call searchDocs.',
                    hasArchitecture
                        ? `\nQUIZ ARCHITECTURE (the original instructional design — use this as your reference when editing or adding questions):\n${architecture}`
                        : '',
                ].filter(Boolean).join('\n'),
            },
            ...modelMessages,
        ],
    });
};