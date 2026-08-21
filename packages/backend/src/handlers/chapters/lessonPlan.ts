import { lessonPlanRequestSchema, type LessonPlanResponse } from '@teagent/shared';
import { generateLessonPlan } from '../../llm/lessonPlan.js';
import { RateLimitedError, ValidationError } from '../../lib/errors.js';
import { okResponse } from '../../lib/httpResponse.js';
import { withErrorHandling } from '../../lib/handlerWrapper.js';
import { getAuthContext, type AuthenticatedEvent } from '../../lib/authContext.js';
import { incrementAndCheckDailyUsage } from '../../db/profilesRepo.js';

const DAILY_LESSON_PLAN_CAP = Number(process.env.DAILY_LESSON_PLAN_CAP ?? 20);

async function lessonPlanHandler(event: AuthenticatedEvent) {
  const { profileId } = getAuthContext(event);
  const parsed = lessonPlanRequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) throw new ValidationError('language, chapterTitle, translation, and glossary are required');

  const usage = await incrementAndCheckDailyUsage(profileId, 'lessonPlan', DAILY_LESSON_PLAN_CAP);
  if (!usage.withinCap) throw new RateLimitedError();

  const { language, chapterTitle, translation, glossary } = parsed.data;
  const lessonPlan = await generateLessonPlan({ language, chapterTitle, translation, glossary });

  const response: LessonPlanResponse = { lessonPlan };
  return okResponse(response);
}

export const handler = withErrorHandling(lessonPlanHandler);
