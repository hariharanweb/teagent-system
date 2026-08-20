import { z } from 'zod';
import { LANGUAGE_CODES } from './languages.js';
import { anyTranslationLineSchema } from './translationLine.schema.js';
import { glossaryEntrySchema } from './glossary.schema.js';
import { CHAPTER_FILE_FORMAT_VERSION } from './chapter.schema.js';

/** A chapter is capped in size at extraction time — see plan risk #1 (chat token budget). */
export const MAX_TRANSLATION_LINES_PER_CHAPTER = 80;

export const extractRequestSchema = z.object({
  s3Key: z.string().min(1),
  language: z.enum(LANGUAGE_CODES),
  chapterTitle: z.string().min(1).max(200),
});
export type ExtractRequest = z.infer<typeof extractRequestSchema>;

export const extractResponseSchema = z.object({
  formatVersion: z.literal(CHAPTER_FILE_FORMAT_VERSION),
  language: z.enum(LANGUAGE_CODES),
  chapterTitle: z.string(),
  translation: z.array(anyTranslationLineSchema),
  glossary: z.array(glossaryEntrySchema),
  warnings: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type ExtractResponse = z.infer<typeof extractResponseSchema>;
