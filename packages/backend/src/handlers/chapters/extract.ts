import {
  CHAPTER_FILE_FORMAT_VERSION,
  extractRequestSchema,
  MAX_TRANSLATION_LINES_PER_CHAPTER,
  type ExtractResponse,
} from '@teagent/shared';
import { extractChapterGraph } from '../../graphs/extractChapterGraph.js';
import { UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { okResponse } from '../../lib/httpResponse.js';
import { withErrorHandling } from '../../lib/handlerWrapper.js';
import { getAuthContext, type AuthenticatedEvent } from '../../lib/authContext.js';
import { incrementAndCheckDailyUsage } from '../../db/profilesRepo.js';
import { RateLimitedError } from '../../lib/errors.js';

const DAILY_EXTRACT_CAP = Number(process.env.DAILY_EXTRACT_CAP ?? 20);

async function extractHandler(event: AuthenticatedEvent) {
  const { profileId } = getAuthContext(event);
  const parsed = extractRequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) throw new ValidationError('s3Key, language, and chapterTitle are required');

  const { s3Key, language, chapterTitle } = parsed.data;

  if (!s3Key.startsWith(`uploads/${profileId}/`)) {
    throw new UnauthorizedError('This upload does not belong to your profile');
  }

  const usage = await incrementAndCheckDailyUsage(profileId, DAILY_EXTRACT_CAP);
  if (!usage.withinCap) throw new RateLimitedError();

  const result = await extractChapterGraph.invoke({ imageS3Key: s3Key, language });

  const warnings = [...result.warnings];
  let translation = result.translationLines;
  if (translation.length > MAX_TRANSLATION_LINES_PER_CHAPTER) {
    translation = translation.slice(0, MAX_TRANSLATION_LINES_PER_CHAPTER);
    warnings.push(
      `This page had more than ${MAX_TRANSLATION_LINES_PER_CHAPTER} lines — showing the first ${MAX_TRANSLATION_LINES_PER_CHAPTER}. Try uploading one page at a time.`,
    );
  }

  const response: ExtractResponse = {
    formatVersion: CHAPTER_FILE_FORMAT_VERSION,
    language,
    chapterTitle,
    translation,
    glossary: result.glossary,
    warnings,
    createdAt: new Date().toISOString(),
  };
  return okResponse(response);
}

export const handler = withErrorHandling(extractHandler);
