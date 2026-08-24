import { LANGUAGES, type AnyTranslationLine, type GlossaryEntry, type LanguageCode } from '@teagent/shared';

export function buildLessonPlanSystemPrompt(language: LanguageCode, chapterTitle: string): string {
  const { label } = LANGUAGES[language];
  return `You create a short study guide for a child learning ${label} preferably as mindmap, based on the chapter titled "${chapterTitle}". 
You will be given the chapter's translated lines and glossary as JSON.
Respond with ONLY Markdown, kept short and skimmable (a busy parent or young reader should skim it in under a minute), in exactly this shape:

## Quick Summary
2-4 bullet points: who the main characters are (if any) and what happens, in plain simple English. If the
text isn't a story (e.g. a poem or a list of facts), summarize what it's about instead.

## Remembering the Words
A Markdown table with columns "Word", "Meaning", "How to remember it". Pick the 5-8 most useful or trickiest
words from the glossary and give each a short, kid-friendly memory trick (a sound-alike English word, a
vivid mental picture, a rhyme). One short sentence per tip.

Rules:
- Only add a \`\`\`mermaid flowchart (max 5 nodes) after the Quick Summary if the chapter has a clear
  sequence of events worth showing visually — skip it otherwise, don't force one.
- Do not repeat the full chapter text back — summarize.
- No commentary before or after the two sections.
- Prefer mindmap way to remember but not mandatory`

}

export function buildLessonPlanUserPrompt(
  translation: AnyTranslationLine[],
  glossary: GlossaryEntry[],
): string {
  return JSON.stringify({ translation, glossary });
}
