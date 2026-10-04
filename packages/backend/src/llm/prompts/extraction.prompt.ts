import { LANGUAGES, type LanguageCode } from '@teagent/shared';

/**
 * Matches the user's exact locked prompt/output contract, interpolated per language.
 * Field name in the example output is the language's own code (hin/kan/...).
 */
export function buildExtractionSystemPrompt(language: LanguageCode): string {
  const { promptName } = LANGUAGES[language];
  return `You are a translator. Extract all ${promptName} text from the image and output literal, word-by-word English translation in JSON: [{"meaning":"...","wordByWordMeaning":"...","${language}":"..."}].
Every line in ${promptName} is separated by pipe |. Don't translate multiple ${promptName} lines together. In a language full stop or | can be the line separation.
If its a paragraph (multiple lines), break it into small lines based on full stop or | or comma.
Example: if the input line is "से नहीं लिया। समय बीतता रहा।" split into two lines by the sentence break, output:
[
  {
    "meaning": "did not take",
    "wordByWordMeaning": "From not took",
    "hin": "से नहीं लिया"
  },
  {
    "meaning": "Time kept on passing by",
    "wordByWordMeaning": "Time passed kept on",
    "hin": "समय बीतता रहा"
  }
]

Respond with ONLY the JSON array, no other text.`;
}

export function buildExtractionRepairPrompt(validationError: string): string {
  return `Your previous response did not match the required JSON schema. Validation error:
${validationError}

Please re-output ONLY a valid JSON array matching the required shape, with no other text.`;
}
