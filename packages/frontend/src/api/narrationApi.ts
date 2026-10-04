import type { NarrateRequest, NarrateResponse } from '@teagent/shared';
import { apiRequest } from './client';

export function narrateLines(request: NarrateRequest): Promise<NarrateResponse> {
  return apiRequest<NarrateResponse>('/chapters/narrate', { method: 'POST', body: request });
}
