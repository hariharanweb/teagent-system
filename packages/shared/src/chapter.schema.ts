import { z } from 'zod';
import { LANGUAGE_CODES, type LanguageCode } from './languages.js';
import { anyTranslationLineSchema } from './translationLine.schema.js';
import { glossaryEntrySchema } from './glossary.schema.js';

export const CHAPTER_FILE_FORMAT_VERSION = 1;

/**
 * The downloadable/reloadable chapter file. Validated on reload so a hand-edited
 * or corrupted file fails gracefully instead of crashing the UI.
 */
export const chapterFileSchema = z
  .object({
    formatVersion: z.literal(CHAPTER_FILE_FORMAT_VERSION),
    language: z.enum(LANGUAGE_CODES),
    chapterTitle: z.string().min(1),
    translation: z.array(anyTranslationLineSchema),
    glossary: z.array(glossaryEntrySchema),
    warnings: z.array(z.string()).default([]),
    createdAt: z.string().datetime(),
  })
  .superRefine((chapter, ctx) => {
    const lang = chapter.language as LanguageCode;
    chapter.translation.forEach((line, i) => {
      if (!(lang in line)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['translation', i, lang],
          message: `translation line ${i} is missing the "${lang}" field required for language "${lang}"`,
        });
      }
    });
  });

export type ChapterFile = z.infer<typeof chapterFileSchema>;
