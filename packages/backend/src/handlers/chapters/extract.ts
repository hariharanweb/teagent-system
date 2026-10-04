import { extractRequestSchema, type ExtractResponse } from '@teagent/shared';
import { extractChapterGraph } from '../../graphs/extractChapterGraph.js';
import { UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { okResponse } from '../../lib/httpResponse.js';
import { withErrorHandling } from '../../lib/handlerWrapper.js';
import { getAuthContext, type AuthenticatedEvent } from '../../lib/authContext.js';
import { incrementAndCheckDailyUsage } from '../../db/profilesRepo.js';
import { RateLimitedError } from '../../lib/errors.js';

const DAILY_EXTRACT_CAP = Number(process.env.DAILY_EXTRACT_CAP ?? 20);

/** Step 1: photo → transcript. The client then sends the transcript to /chapters/translate. */
async function extractHandler(event: AuthenticatedEvent) {
  const { profileId } = getAuthContext(event);
  const parsed = extractRequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) throw new ValidationError('s3Key and language are required');

  const { s3Key, language } = parsed.data;

  if (!s3Key.startsWith(`uploads/${profileId}/`)) {
    throw new UnauthorizedError('This upload does not belong to your profile');
  }

  const usage = await incrementAndCheckDailyUsage(profileId, 'extract', DAILY_EXTRACT_CAP);
  if (!usage.withinCap) throw new RateLimitedError();

  const result = await extractChapterGraph.invoke({ imageS3Key: s3Key, language });
  if (result.transcript.length === 0) {
    throw new ValidationError("Couldn't read any text on this page — try a clearer, straighter photo.");
  }

  const response: ExtractResponse = { language, transcript: result.transcript, warnings: result.warnings };
  return okResponse(response);
}

export const handler = withErrorHandling(extractHandler);
