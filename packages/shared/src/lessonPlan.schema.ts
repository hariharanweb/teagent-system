import { z } from 'zod';
import { LANGUAGE_CODES } from './languages.js';
import { anyTranslationLineSchema } from './translationLine.schema.js';
import { glossaryEntrySchema } from './glossary.schema.js';

export const lessonPlanRequestSchema = z.object({
  language: z.enum(LANGUAGE_CODES),
  chapterTitle: z.string().min(1),
  translation: z.array(anyTranslationLineSchema),
  glossary: z.array(glossaryEntrySchema),
});
export type LessonPlanRequest = z.infer<typeof lessonPlanRequestSchema>;

export const lessonPlanResponseSchema = z.object({
  lessonPlan: z.string(),
});
export type LessonPlanResponse = z.infer<typeof lessonPlanResponseSchema>;
