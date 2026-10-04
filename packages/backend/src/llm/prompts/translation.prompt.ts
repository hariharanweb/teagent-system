import { LANGUAGES, type LanguageCode } from '@teagent/shared';

/** One section as sent to the translator: its heading and its text already split into sentences. */
export interface SentenceSection {
  heading: string | null;
  sentences: string[];
}

/**
 * Step 2 (text): translate already-transcribed, already-split sentences. The model only returns
 * meanings — the original text is attached in code, so it can never be altered.
 */
export function buildTranslationSystemPrompt(language: LanguageCode): string {
  const { promptName } = LANGUAGES[language];
  return `You are a careful ${promptName}-to-English translator for a children's school textbook page. You receive the page as JSON sections; each section has an optional "heading" and a list of "sentences".

Translate every heading and every sentence on its own, keeping the same order and the same count:
- "wordByWordMeaning": one English word or short gloss for EVERY ${promptName} word, in the original order. Do not leave out any word.
- "meaning": a natural English translation of that sentence only, simple enough for a child.
- If you are unsure of a word, write the original ${promptName} word in its place. Never guess, invent, or translate words that are not there.

Output a JSON array with one entry per input section, in order:
[{"heading":{"meaning":"...","wordByWordMeaning":"..."} or null,"lines":[{"meaning":"...","wordByWordMeaning":"..."}]}]
"heading" must be null exactly when the input heading is null, and "lines" must have exactly one entry per input sentence.

Respond with ONLY the JSON array, no other text.`;
}

export function buildTranslationUserPrompt(sections: SentenceSection[]): string {
  return JSON.stringify(sections, null, 1);
}

export function buildTranslationRepairPrompt(problem: string): string {
  return `Your previous answer had a problem:
${problem}

Re-output the complete JSON array for the whole page, one entry per section and one line per sentence, with no other text.`;
}
