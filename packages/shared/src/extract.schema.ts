import { z } from 'zod';
import { LANGUAGE_CODES } from './languages.js';
import { anyTranslationLineSchema } from './translationLine.schema.js';
import { glossaryEntrySchema } from './glossary.schema.js';

/** A page is capped in size at extraction time — see plan risk #1 (chat token budget). */
export const MAX_TRANSLATION_LINES_PER_PAGE = 80;

/** Bounds a transcript so /chapters/translate can't be used as an unbounded translation API. */
export const MAX_TRANSCRIPT_CHARS = 8000;

/**
 * Step 1 of extraction: the page's text exactly as printed, grouped into sections in reading
 * order. `lines` are printed lines (not sentences); `heading` is the section's own printed heading.
 */
export const pageTranscriptSchema = z
  .array(
    z.object({
      section: z.string().min(1),
      heading: z.string().min(1).nullish(),
      lines: z.array(z.string().min(1)),
    }),
  )
  .min(1)
  .max(30)
  .refine(
    (sections) =>
      sections.reduce((n, s) => n + (s.heading?.length ?? 0) + s.lines.join('').length, 0) <= MAX_TRANSCRIPT_CHARS,
    { message: `transcript is longer than ${MAX_TRANSCRIPT_CHARS} characters` },
  );
export type PageTranscript = z.infer<typeof pageTranscriptSchema>;

export const extractRequestSchema = z.object({
  s3Key: z.string().min(1),
  language: z.enum(LANGUAGE_CODES),
});
export type ExtractRequest = z.infer<typeof extractRequestSchema>;

/** Step 1 result: what the page says. Translation is a separate request (step 2). */
export const extractResponseSchema = z.object({
  language: z.enum(LANGUAGE_CODES),
  transcript: pageTranscriptSchema,
  warnings: z.array(z.string()),
});
export type ExtractResponse = z.infer<typeof extractResponseSchema>;

export const translateRequestSchema = z.object({
  language: z.enum(LANGUAGE_CODES),
  transcript: pageTranscriptSchema,
});
export type TranslateRequest = z.infer<typeof translateRequestSchema>;

/** Step 2 result: one page's translation. Chapter-level fields (title, other pages) are assembled client-side. */
export const translateResponseSchema = z.object({
  language: z.enum(LANGUAGE_CODES),
  translation: z.array(anyTranslationLineSchema),
  glossary: z.array(glossaryEntrySchema),
  warnings: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type TranslateResponse = z.infer<typeof translateResponseSchema>;
