import { z } from 'zod';
import { LANGUAGE_CODES } from './languages.js';

export const glossaryEntrySchema = z.object({
  word: z.string().min(1),
  language: z.enum(LANGUAGE_CODES),
  meaning: z.string().min(1),
  synonyms: z.array(z.string().min(1)).default([]),
});

export const glossarySchema = z.array(glossaryEntrySchema);

export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;
