import { narrateRequestSchema, type NarrateResponse } from '@teagent/shared';
import { synthesizeLines } from '../../llm/tts.js';
import { RateLimitedError, ValidationError } from '../../lib/errors.js';
import { okResponse } from '../../lib/httpResponse.js';
import { withErrorHandling } from '../../lib/handlerWrapper.js';
import { getAuthContext, type AuthenticatedEvent } from '../../lib/authContext.js';
import { incrementAndCheckDailyUsage } from '../../db/profilesRepo.js';

// Counted per page: the client sends one page's lines per request.
const DAILY_NARRATION_CAP = Number(process.env.DAILY_NARRATION_CAP ?? 60);

async function narrateHandler(event: AuthenticatedEvent) {
  const { profileId } = getAuthContext(event);
  const parsed = narrateRequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) throw new ValidationError('language and 1–80 non-empty lines are required');

  const usage = await incrementAndCheckDailyUsage(profileId, 'narration', DAILY_NARRATION_CAP);
  if (!usage.withinCap) throw new RateLimitedError();

  const clips = await synthesizeLines(parsed.data.lines, parsed.data.language);

  const response: NarrateResponse = { clips };
  return okResponse(response);
}

export const handler = withErrorHandling(narrateHandler);
