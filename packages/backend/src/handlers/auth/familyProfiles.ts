import type { FamilyProfilesResponse } from '@teagent/shared';
import { listFamilyProfiles } from '../../db/profilesRepo.js';
import { okResponse } from '../../lib/httpResponse.js';
import { withErrorHandling } from '../../lib/handlerWrapper.js';
import { getAuthContext, type AuthenticatedEvent } from '../../lib/authContext.js';

async function familyProfilesHandler(event: AuthenticatedEvent) {
  const { familyId } = getAuthContext(event);
  const profiles = await listFamilyProfiles(familyId);
  const response: FamilyProfilesResponse = { profiles };
  return okResponse(response);
}

export const handler = withErrorHandling(familyProfilesHandler);
