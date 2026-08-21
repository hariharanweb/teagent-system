import { z } from 'zod';
import { LANGUAGE_CODES, type LanguageCode } from './languages.js';
import { anyTranslationLineSchema } from './translationLine.schema.js';
import { glossaryEntrySchema, type GlossaryEntry } from './glossary.schema.js';

export const CHAPTER_FILE_FORMAT_VERSION = 2;

/** A chapter can span multiple photographed pages — bounded to keep chat's per-turn payload sane. */
export const MAX_PAGES_PER_CHAPTER = 15;

/** One uploaded image's extraction result within a chapter. */
export const chapterPageSchema = z.object({
  pageId: z.string().uuid(),
  translation: z.array(anyTranslationLineSchema),
  glossary: z.array(glossaryEntrySchema),
  warnings: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});
export type ChapterPage = z.infer<typeof chapterPageSchema>;

/**
 * The downloadable/reloadable chapter file. Validated on reload so a hand-edited
 * or corrupted file fails gracefully instead of crashing the UI.
 */
export const chapterFileSchema = z
  .object({
    formatVersion: z.literal(CHAPTER_FILE_FORMAT_VERSION),
    language: z.enum(LANGUAGE_CODES),
    chapterTitle: z.string().min(1),
    pages: z.array(chapterPageSchema).min(1).max(MAX_PAGES_PER_CHAPTER),
    createdAt: z.string().datetime(),
    /** Generated on-demand when the Lesson Plan tab is first opened, not at extraction time. */
    lessonPlan: z.string().optional(),
  })
  .superRefine((chapter, ctx) => {
    const lang = chapter.language as LanguageCode;
    chapter.pages.forEach((page, pi) => {
      page.translation.forEach((line, li) => {
        if (!(lang in line)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pages', pi, 'translation', li, lang],
            message: `page ${pi} translation line ${li} is missing the "${lang}" field required for language "${lang}"`,
          });
        }
      });
    });
  });

export type ChapterFile = z.infer<typeof chapterFileSchema>;

export function flattenChapterTranslation(chapter: ChapterFile) {
  return chapter.pages.flatMap((page) => page.translation);
}

/** Merges glossary entries across pages, de-duplicating by word+language (first occurrence wins). */
export function flattenChapterGlossary(chapter: ChapterFile): GlossaryEntry[] {
  const seen = new Map<string, GlossaryEntry>();
  for (const page of chapter.pages) {
    for (const entry of page.glossary) {
      const key = `${entry.language}:${entry.word}`;
      if (!seen.has(key)) seen.set(key, entry);
    }
  }
  return [...seen.values()];
}
