/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { agentLogger } from '@/lib/logger';

const translationItem = z.object({
    lang: z.string(),
    text: z.string(),
});

const translatedQuizOutput = Output.object({
    schema: z.object({
        questions: z.array(
            z.object({
                id: z.uuidv4(),
                questionText: z.array(translationItem),
                questionType: z.enum(['true_false', 'single_choice', 'multiple_choice']),
                options: z.array(
                    z.object({
                        id: z.uuidv4(),
                        optionText: z.array(translationItem),
                        isCorrect: z.boolean(),
                    })
                ),
            })
        ),
    }),
});

export const translator = async ({
    languages,
    draft,
}: {
    languages: string[];
    draft: any;
}) => {
    const log = agentLogger('translator');
    const questionCount = draft?.length ?? 0;

    log.info({ languages, questionCount }, 'Translator started');

    const start = Date.now();

    try {
        const { output } = await generateText({
            model: openai(process.env.TRANSLATOR || 'gpt-4o-mini'),
            output: translatedQuizOutput,
            system: `
You are a professional quiz translator.

Return ONLY valid JSON matching the schema.

Rules:
- Respect the already giving IDs.
- Translate ALL text into ONLY the requested languages listed below. Do NOT add any extra language, including the source language of the draft.
- questionText and optionText must be arrays of translation items.
- Each item must have a "lang" key equal to one of the provided language codes, and a "text" key with the translation.
- Do not invent languages.
- Do not skip any language.
- Preserve correctness flags.
`,
            prompt: `
Target languages:
${languages.join(', ')}

Translate this quiz draft into multilingual format.

Draft:
${JSON.stringify(draft, null, 2)}
`,
        });

        log.info({
            languages,
            questionCount,
            translatedCount: output?.questions?.length ?? 0,
            durationMs: Date.now() - start,
        }, 'Translator completed');

        return output;
    } catch (err) {
        log.error({ languages, questionCount, err, durationMs: Date.now() - start }, 'Translator failed');
        throw err;
    }
};