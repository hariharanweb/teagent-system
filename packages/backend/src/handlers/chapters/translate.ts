import { MAX_TRANSLATION_LINES_PER_PAGE, translateRequestSchema, type TranslateResponse } from '@teagent/shared';
import { translateChapterGraph } from '../../graphs/translateChapterGraph.js';
import { RateLimitedError, ValidationError } from '../../lib/errors.js';
import { okResponse } from '../../lib/httpResponse.js';
import { withErrorHandling } from '../../lib/handlerWrapper.js';
import { getAuthContext, type AuthenticatedEvent } from '../../lib/authContext.js';
import { incrementAndCheckDailyUsage } from '../../db/profilesRepo.js';

const DAILY_TRANSLATE_CAP = Number(process.env.DAILY_TRANSLATE_CAP ?? 20);

/** Step 2: transcript → translation lines + glossary. Never alters the transcript's text. */
async function translateHandler(event: AuthenticatedEvent) {
  const { profileId } = getAuthContext(event);
  const parsed = translateRequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) throw new ValidationError('language and a page transcript are required');

  const usage = await incrementAndCheckDailyUsage(profileId, 'translate', DAILY_TRANSLATE_CAP);
  if (!usage.withinCap) throw new RateLimitedError();

  const { language, transcript } = parsed.data;
  const result = await translateChapterGraph.invoke({ language, transcript });

  const warnings = [...result.warnings];
  let translation = result.translationLines;
  if (translation.length > MAX_TRANSLATION_LINES_PER_PAGE) {
    translation = translation.slice(0, MAX_TRANSLATION_LINES_PER_PAGE);
    warnings.push(
      `This page had more than ${MAX_TRANSLATION_LINES_PER_PAGE} lines — showing the first ${MAX_TRANSLATION_LINES_PER_PAGE}. Try splitting it into two photos.`,
    );
  }

  const response: TranslateResponse = {
    language,
    translation,
    glossary: result.glossary,
    warnings,
    createdAt: new Date().toISOString(),
  };
  return okResponse(response);
}

export const handler = withErrorHandling(translateHandler);
