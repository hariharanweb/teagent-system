import type { ExtractRequest, ExtractResponse } from '@teagent/shared';
import { apiRequest } from './client';

export function extractChapter(request: ExtractRequest): Promise<ExtractResponse> {
  return apiRequest<ExtractResponse>('/chapters/extract', { method: 'POST', body: request });
}
