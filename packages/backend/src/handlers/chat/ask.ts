import { chatAskRequestSchema, type ChatAskResponse } from '@teagent/shared';
import { chatGraph } from '../../graphs/chatGraph.js';
import { RateLimitedError, ValidationError } from '../../lib/errors.js';
import { okResponse } from '../../lib/httpResponse.js';
import { withErrorHandling } from '../../lib/handlerWrapper.js';
import { getAuthContext, type AuthenticatedEvent } from '../../lib/authContext.js';
import { incrementAndCheckDailyUsage } from '../../db/profilesRepo.js';

const DAILY_CHAT_CAP = Number(process.env.DAILY_CHAT_CAP ?? 200);

async function chatAskHandler(event: AuthenticatedEvent) {
  const { profileId } = getAuthContext(event);
  const parsed = chatAskRequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) throw new ValidationError('Invalid chat request');

  const usage = await incrementAndCheckDailyUsage(profileId, 'chat', DAILY_CHAT_CAP);
  if (!usage.withinCap) throw new RateLimitedError("Dev needs a break! Try again tomorrow.");

  const { language, chapterTitle, translation, glossary, history, message } = parsed.data;
  const result = await chatGraph.invoke({
    userMessage: message,
    language,
    chapterTitle,
    translation,
    glossary,
    history,
  });

  const response: ChatAskResponse = { reply: result.reply, scope: result.scope };
  return okResponse(response);
}

export const handler = withErrorHandling(chatAskHandler);
