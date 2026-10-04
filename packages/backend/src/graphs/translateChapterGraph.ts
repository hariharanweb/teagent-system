import { END, START, StateGraph } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { glossarySchema, type AnyTranslationLine, type LanguageCode, type PageTranscript } from '@teagent/shared';
import { getTextModel, getTranslationModel } from '../llm/openaiClients.js';
import {
  buildTranslationRepairPrompt,
  buildTranslationSystemPrompt,
  buildTranslationUserPrompt,
  type SentenceSection,
} from '../llm/prompts/translation.prompt.js';
import { buildGlossarySystemPrompt, buildGlossaryUserPrompt } from '../llm/prompts/glossary.prompt.js';
import { extractJson } from '../llm/parseJson.js';
import { splitSentences } from '../lib/sentences.js';
import { TranslateState, type TranslateStateType } from './state.js';

const MAX_TRANSLATION_ATTEMPTS = 2; // one initial attempt + one repair retry

const meaningSchema = z.object({ meaning: z.string().min(1), wordByWordMeaning: z.string().min(1) });
const translatedSectionsSchema = z.array(z.object({ heading: meaningSchema.nullish(), lines: z.array(meaningSchema) }));
type TranslatedSections = z.infer<typeof translatedSectionsSchema>;

export function toSentenceSections(transcript: PageTranscript): SentenceSection[] {
  return transcript.map((s) => {
    const heading = s.heading ?? null;
    // Models sometimes repeat a heading as the section's first line; don't show it twice.
    const lines = heading && s.lines[0]?.trim() === heading.trim() ? s.lines.slice(1) : s.lines;
    return { heading, sentences: splitSentences(lines) };
  });
}

/** Describes every place the model's output doesn't line up one-to-one with the input, or null. */
export function findMisalignment(input: SentenceSection[], output: TranslatedSections): string | null {
  if (output.length !== input.length) return `Expected ${input.length} sections but got ${output.length}.`;
  const problems = input.flatMap((section, i) => {
    const out = output[i]!;
    const issues: string[] = [];
    if (!!section.heading !== !!out.heading) issues.push(`section ${i + 1}: heading should be ${section.heading ? 'translated' : 'null'}`);
    if (out.lines.length !== section.sentences.length) {
      issues.push(`section ${i + 1}: expected ${section.sentences.length} lines but got ${out.lines.length}`);
    }
    return issues;
  });
  return problems.length > 0 ? problems.join('\n') : null;
}

/** Attaches the original text (from the transcript, never from the model) to each meaning. */
function assembleLines(
  transcript: PageTranscript,
  input: SentenceSection[],
  output: TranslatedSections,
  language: LanguageCode,
): AnyTranslationLine[] {
  return input.flatMap((section, i) => {
    const out = output[i];
    const name = transcript[i]!.section;
    const pair = (text: string, m: z.infer<typeof meaningSchema> | null | undefined) =>
      ({ meaning: m?.meaning ?? '—', wordByWordMeaning: m?.wordByWordMeaning ?? '—', [language]: text, section: name }) as AnyTranslationLine;
    return [
      ...(section.heading ? [pair(section.heading, out?.heading)] : []),
      ...section.sentences.map((sentence, j) => pair(sentence, out?.lines[j])),
    ];
  });
}

async function translateNode(state: TranslateStateType): Promise<Partial<TranslateStateType>> {
  const model = await getTranslationModel();
  const attempt = state.translationAttempts + 1;
  const input = toSentenceSections(state.transcript);

  const messages = [
    new SystemMessage(buildTranslationSystemPrompt(state.language)),
    new HumanMessage(buildTranslationUserPrompt(input)),
  ];
  if (state.lastProblem) messages.push(new SystemMessage(buildTranslationRepairPrompt(state.lastProblem)));

  const response = await model.invoke(messages);
  const rawText = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  let output: TranslatedSections;
  try {
    output = translatedSectionsSchema.parse(extractJson(rawText));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { translationAttempts: attempt, lastProblem: `Invalid JSON shape: ${message}` };
  }

  const misaligned = findMisalignment(input, output);
  if (misaligned && attempt < MAX_TRANSLATION_ATTEMPTS) return { translationAttempts: attempt, lastProblem: misaligned };

  const translationLines = assembleLines(state.transcript, input, output, state.language);
  return {
    translationAttempts: attempt,
    translationLines,
    lastProblem: null,
    // Out of retries: every original sentence is still shown, but some meanings may be off by a line.
    warnings: misaligned ? ['Some meanings may not line up with their sentence — compare with the book.'] : [],
  };
}

function shouldRetryTranslation(state: TranslateStateType): 'translateNode' | 'glossaryNode' {
  if (state.translationLines.length > 0) return 'glossaryNode';
  return state.translationAttempts < MAX_TRANSLATION_ATTEMPTS ? 'translateNode' : 'glossaryNode';
}

async function glossaryNode(state: TranslateStateType): Promise<Partial<TranslateStateType>> {
  if (state.translationLines.length === 0) {
    return {
      warnings: [
        `translation failed after ${state.translationAttempts} attempts: ${state.lastProblem ?? 'unknown error'}`,
        'skipped glossary generation: no translation lines were produced',
      ],
    };
  }

  const model = await getTextModel();
  const messages = [
    new SystemMessage(buildGlossarySystemPrompt(state.language)),
    new HumanMessage(buildGlossaryUserPrompt(state.translationLines)),
  ];

  try {
    const response = await model.invoke(messages);
    const rawText = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const glossary = glossarySchema.parse(extractJson(rawText));
    return { glossary };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { warnings: [`glossary generation failed, returning empty glossary: ${message}`] };
  }
}

const graph = new StateGraph(TranslateState)
  .addNode('translateNode', translateNode)
  .addNode('glossaryNode', glossaryNode)
  .addEdge(START, 'translateNode')
  .addConditionalEdges('translateNode', shouldRetryTranslation, {
    translateNode: 'translateNode',
    glossaryNode: 'glossaryNode',
  })
  .addEdge('glossaryNode', END);

export const translateChapterGraph = graph.compile();
