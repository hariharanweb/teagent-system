import { LANGUAGES, type LanguageCode, type AnyTranslationLine } from '@teagent/shared';

export function buildGlossarySystemPrompt(language: LanguageCode): string {
  const { promptName } = LANGUAGES[language];
  return `You help build a vocabulary glossary for a child learning ${promptName}.
Given a list of translated ${promptName} lines, pick out words that are "complicated" —
uncommon, advanced, or likely unfamiliar to a young learner (roughly ages 6-12).
Skip simple, everyday words.

For each complicated word, output:
{ "word": "<the ${promptName} word, exactly as written>", "language": "${language}", "meaning": "<simple English meaning>", "synonyms": ["<1-4 ${promptName} synonyms>"] }

Respond with ONLY a JSON array of these objects, no other text. It is fine to return an empty array if nothing qualifies as complicated.`;
}

export function buildGlossaryUserPrompt(lines: AnyTranslationLine[]): string {
  return JSON.stringify(lines);
}
