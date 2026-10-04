import { LANGUAGES, type LanguageCode } from '@teagent/shared';

/**
 * Step 1 (vision): transcription only. Translating in the same call made the model "correct"
 * rare words into familiar ones (e.g. Kannada ವಠಾರ → ಪಟ್ಟಣ), so reading and translating are split.
 */
export function buildTranscriptionSystemPrompt(language: LanguageCode): string {
  const { promptName } = LANGUAGES[language];
  return `You transcribe a photographed ${promptName} school textbook page. You do not translate.

1. IDENTIFY SECTIONS in reading order: the chapter title (with its number), an author/byline, every boxed or side panel (each usually has its own small heading), and the main body text (narration, dialogue, poem...). Ignore page numbers, QR codes, logos, corner labels, and faint text showing through from the other side of the paper.

2. COPY EVERY PRINTED LINE of each section exactly as printed, letter by letter, from the first word to the last. Never skip, merge, reorder, summarise or translate anything. Text that wraps around a picture is still part of the same paragraph — keep reading it. Keep punctuation, brackets and speaker labels (e.g. "ಸೇತು:") as printed.
   Copy unfamiliar, rare or dialect words exactly even if they look unusual. Never replace a word with a more common or "corrected" one, and never change a letter to make a word you know — a misread word is worse than an unusual one.

3. CHECK: re-read the image section by section and confirm every printed line appears in your output.

Put the chapter title in "lines" (with "heading": null). Use "heading" only for a panel's own small heading, and never repeat the heading inside "lines".

Output a JSON array of sections:
[{"section":"<short English name>","heading":"<the section's printed heading, or null>","lines":["<printed line 1>","<printed line 2>"]}]

Respond with ONLY the JSON array, no other text.`;
}

export function buildTranscriptionRepairPrompt(validationError: string): string {
  return `Your previous response did not match the required JSON shape. Validation error:
${validationError}

Re-output ONLY a valid JSON array of sections, each {"section": string, "heading": string or null, "lines": [string, ...]}, with no other text. Do not drop any lines while fixing it.`;
}
