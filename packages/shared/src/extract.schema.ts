import { z } from 'zod';
import { LANGUAGE_CODES } from './languages.js';
import { anyTranslationLineSchema } from './translationLine.schema.js';
import { glossaryEntrySchema } from './glossary.schema.js';

/** A page is capped in size at extraction time — see plan risk #1 (chat token budget). */
export const MAX_TRANSLATION_LINES_PER_PAGE = 80;

export const extractRequestSchema = z.object({
  s3Key: z.string().min(1),
  language: z.enum(LANGUAGE_CODES),
});
export type ExtractRequest = z.infer<typeof extractRequestSchema>;

/** One page's extraction result. Chapter-level fields (title, other pages) are assembled client-side. */
export const extractResponseSchema = z.object({
  language: z.enum(LANGUAGE_CODES),
  translation: z.array(anyTranslationLineSchema),
  glossary: z.array(glossaryEntrySchema),
  warnings: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type ExtractResponse = z.infer<typeof extractResponseSchema>;
