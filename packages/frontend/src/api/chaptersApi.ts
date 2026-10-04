import type { ExtractRequest, ExtractResponse, TranslateRequest, TranslateResponse } from '@teagent/shared';
import { apiRequest } from './client';

/** Step 1: photo → transcript of the page as printed. */
export function extractChapter(request: ExtractRequest): Promise<ExtractResponse> {
  return apiRequest<ExtractResponse>('/chapters/extract', { method: 'POST', body: request });
}

/** Step 2: transcript → translation lines + glossary. */
export function translateChapter(request: TranslateRequest): Promise<TranslateResponse> {
  return apiRequest<TranslateResponse>('/chapters/translate', { method: 'POST', body: request });
}
