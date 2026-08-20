export const LANGUAGES = {
  hin: { code: 'hin', label: 'Hindi', promptName: 'Hindi' },
  kan: { code: 'kan', label: 'Kannada', promptName: 'Kannada' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as [LanguageCode, ...LanguageCode[]];

export function isLanguageCode(value: string): value is LanguageCode {
  return value in LANGUAGES;
}
