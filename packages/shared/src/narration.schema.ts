import { z } from 'zod';
import { LANGUAGE_CODES } from './languages.js';
import { MAX_TRANSLATION_LINES_PER_PAGE } from './extract.schema.js';

/** One narrate request covers one page's original-language lines. */
export const MAX_NARRATION_LINES_PER_REQUEST = MAX_TRANSLATION_LINES_PER_PAGE;

export const narrateRequestSchema = z.object({
  language: z.enum(LANGUAGE_CODES),
  lines: z.array(z.string().min(1)).min(1).max(MAX_NARRATION_LINES_PER_REQUEST),
});
export type NarrateRequest = z.infer<typeof narrateRequestSchema>;

/** One base64 MP3 clip per requested line, in the same order. */
export const narrateResponseSchema = z.object({
  clips: z.array(z.string().min(1)),
});
export type NarrateResponse = z.infer<typeof narrateResponseSchema>;

const spanSchema = z.object({ start: z.number().nonnegative(), end: z.number().nonnegative() });

/**
 * Word timings for a Narration, stored in the Narration file's ID3 tag so a downloaded MP3
 * can be reopened with highlighting and no regeneration. The audio is the pages' MP3 bytes
 * back to back, in `pages` order; times are seconds from the start of their own page.
 */
export const narrationTagSchema = z.object({
  v: z.literal(1),
  language: z.enum(LANGUAGE_CODES),
  pages: z.array(
    z.object({
      pageId: z.string(),
      fingerprint: z.string(),
      byteLength: z.number().int().positive(),
      lines: z.array(spanSchema.extend({ words: z.array(spanSchema) })),
    }),
  ),
});
export type NarrationTag = z.infer<typeof narrationTagSchema>;
export type NarrationPageTiming = NarrationTag['pages'][number];
export type NarrationLineTiming = NarrationPageTiming['lines'][number];
