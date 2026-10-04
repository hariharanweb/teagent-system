import { LANGUAGES, type LanguageCode } from '@teagent/shared';

/** Voice direction for gpt-4o-mini-tts: a kind female teacher reading aloud to a young child. */
export function buildNarrationInstructions(language: LanguageCode): string {
  const { promptName } = LANGUAGES[language];
  return `Speak in ${promptName} as a kind, patient female school teacher reading a textbook aloud to a young child.
Read slowly and warmly, pronouncing every word clearly and fully — never skip or blur words.
Use a gentle, encouraging tone with natural expression for dialogue and questions.
Pause briefly at commas and a little longer at the end of the sentence.
Read the text exactly as written; do not add, explain or translate anything.`;
}
