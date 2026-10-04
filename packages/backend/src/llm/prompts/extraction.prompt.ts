import { LANGUAGES, type LanguageCode } from '@teagent/shared';

/**
 * Asks for the page as ordered sections of lines; the graph flattens them into
 * translation lines tagged with their section. Field name for the original text
 * is the language's own code (hin/kan/...).
 */
export function buildExtractionSystemPrompt(language: LanguageCode): string {
  const { promptName } = LANGUAGES[language];
  return `You are a careful ${promptName}-to-English translator for a school textbook page. Accuracy and completeness matter more than fluency.

Follow these steps in order:

1. IDENTIFY SECTIONS. Look at the whole page and list its sections in reading order: the chapter title, every boxed or side panel (each usually has its own small heading), and the main body text. Ignore page numbers, QR codes, logos and labels inside illustrations.

2. TRANSCRIBE EVERY LINE. For each section, copy the ${promptName} text exactly as printed, from the first word to the last. Never skip, merge, reorder, shorten or summarise any sentence. Text that wraps around a picture is still part of the same paragraph — keep reading it.
   Split into lines at sentence ends: full stop (। or .), ?, ! or |. Only split at a comma if the sentence is very long. Each line must contain the complete words between those breaks.

3. TRANSLATE EACH LINE on its own:
   - "wordByWordMeaning": one English word or short gloss for EVERY ${promptName} word, in the original order. Do not leave out any word.
   - "meaning": a natural English translation of that line only.
   - If you cannot translate a word, write the original ${promptName} word in its place. Never guess, invent or add words that are not on the page.

4. CHECK. Before answering, re-read the image section by section and confirm every printed sentence appears in your output. Add anything missing.

Output a JSON array of sections:
[{"section":"<short English name of the section>","heading":<the section's printed heading as a line, or null if it has none>,"lines":[{"meaning":"...","wordByWordMeaning":"...","${language}":"..."}]}]

Example for a page with a boxed panel and a story:
[
  {
    "section": "Discussion on the lesson",
    "heading": { "meaning": "Discussion on the lesson", "wordByWordMeaning": "Lesson on discussion", "hin": "पाठ पर चर्चा" },
    "lines": [
      { "meaning": "Ask the children what work they do in the morning, evening and night.", "wordByWordMeaning": "Children from ask that they morning, evening and night at which-which work do", "hin": "बच्चों से पूछें कि वे सुबह, शाम और रात को कौन-कौन से कार्य करते हैं" }
    ]
  },
  {
    "section": "Story",
    "heading": null,
    "lines": [
      { "meaning": "Morning, afternoon, evening and night were four friends.", "wordByWordMeaning": "Morning, afternoon, evening and night four friends were", "hin": "सुबह, दोपहर, शाम और रात चार सहेलियाँ थीं" },
      { "meaning": "Once all four started quarrelling among themselves.", "wordByWordMeaning": "One time all-four among-themselves in quarrel do started", "hin": "एक बार चारों आपस में झगड़ा करने लगीं" }
    ]
  }
]

Respond with ONLY the JSON array, no other text.`;
}

export function buildExtractionRepairPrompt(validationError: string): string {
  return `Your previous response did not match the required JSON schema. Validation error:
${validationError}

Please re-output ONLY a valid JSON array of sections, each {"section": string, "heading": line or null, "lines": [line, ...]}, with no other text. Do not drop any lines while fixing it.`;
}
