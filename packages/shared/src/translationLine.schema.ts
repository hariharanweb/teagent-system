import { z } from 'zod';
import { LANGUAGE_CODES, type LanguageCode } from './languages.js';

const baseLineFields = {
  meaning: z.string().min(1),
  wordByWordMeaning: z.string().min(1),
};

/** Builds the exact required line shape for one language: {meaning, wordByWordMeaning, [lang]}. */
export function makeTranslationLineSchema<L extends LanguageCode>(lang: L) {
  return z.object({
    ...baseLineFields,
    [lang]: z.string().min(1),
  } as Record<'meaning' | 'wordByWordMeaning' | L, z.ZodString>);
}

export function translationLinesSchema<L extends LanguageCode>(lang: L) {
  return z.array(makeTranslationLineSchema(lang));
}

/** Accepts a line for any known language — used when the language isn't known until parse time (e.g. reloading a saved file). */
export const anyTranslationLineSchema = z.union(
  LANGUAGE_CODES.map((lang) => makeTranslationLineSchema(lang)) as [
    ReturnType<typeof makeTranslationLineSchema>,
    ReturnType<typeof makeTranslationLineSchema>,
    ...ReturnType<typeof makeTranslationLineSchema>[],
  ],
);

export type TranslationLine<L extends LanguageCode = LanguageCode> = z.infer<
  ReturnType<typeof makeTranslationLineSchema<L>>
>;

/** A translation line for any single known language (not "all languages at once"). */
export type AnyTranslationLine = z.infer<typeof anyTranslationLineSchema>;
