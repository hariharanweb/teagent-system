import type { FamilyProfilesResponse, LoginRequest, LoginResponse } from '@teagent/shared';
import { apiRequest } from './client';

export function login(request: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: request });
}

export function fetchFamilyProfiles(): Promise<FamilyProfilesResponse> {
  return apiRequest<FamilyProfilesResponse>('/auth/family-profiles');
}
