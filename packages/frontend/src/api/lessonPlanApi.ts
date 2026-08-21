import type { LessonPlanRequest, LessonPlanResponse } from '@teagent/shared';
import { apiRequest } from './client';

export function fetchLessonPlan(request: LessonPlanRequest): Promise<LessonPlanResponse> {
  return apiRequest<LessonPlanResponse>('/chapters/lesson-plan', { method: 'POST', body: request });
}
