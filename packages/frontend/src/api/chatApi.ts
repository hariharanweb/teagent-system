import type { ChatAskRequest, ChatAskResponse } from '@teagent/shared';
import { apiRequest } from './client';

export function askDev(request: ChatAskRequest): Promise<ChatAskResponse> {
  return apiRequest<ChatAskResponse>('/chat/ask', { method: 'POST', body: request });
}
