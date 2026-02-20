import { generateText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { searchDocs } from '@/lib/tools/search-docs';

interface QuizUserInput {
    documents: string[];
    topic?: string;
    questionCount?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    questionTypes?: ('true_false' | 'single_choice' | 'multiple_choice')[];
    language?: string;
    additionalPrompt?: string;
}

export const architect = async (input: QuizUserInput): Promise<string> => {
    const result = await generateText({
        model: openai(process.env.ARCHITECT || 'gpt-4o-mini'),
        stopWhen: stepCountIs(6), // max 5 searches + 1 final text step
        toolChoice: 'auto',       // allows the model to stop searching and write
        tools: { searchDocs },
        system: `You are an expert instructional designer and quiz architect.
You have access to a document knowledge base via the searchDocs tool.

RULES:
- Call searchDocs 3 to 5 times maximum using meaningful topic keywords (NOT document IDs).
- Once you have enough context, stop calling tools and write the architecture.
- Base the architecture ONLY on what you retrieved.

The architecture must include:
- Summary of key concepts and themes found
- Exact quiz parameters (question count, types, difficulty, language)
- Topics and subtopics to cover with suggested distribution
- Common misconceptions or tricky areas worth testing
- Clear instructions the quiz builder must follow`,
        prompt: `Generate a quiz architecture for documents with IDs: ${input.documents.join(', ')}

IMPORTANT: When calling searchDocs, always pass documentIds: [${input.documents.map(id => `"${id}"`).join(', ')}]

Quiz preferences:
- Topic focus: ${input.topic ?? 'derive from the document'}
- Number of questions: ${input.questionCount ?? 10}
- Difficulty: ${input.difficulty ?? 'medium'}
- Question types: ${input.questionTypes?.join(', ') ?? 'mcq, true_false'}
- Language: ${input.language ?? 'same as the document'}
- Additional prompt: ${input.additionalPrompt ?? 'none'}

Search using topic keywords, then write the architecture.`,
    });

    const architecture =
        result.text ||
        result.steps.findLast((s) => s.text.length > 0)?.text ||
        '';

    return architecture;
};