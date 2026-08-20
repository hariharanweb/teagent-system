import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { loginRequestSchema, type LoginResponse } from '@teagent/shared';
import { comparePassword } from '../../auth/password.js';
import { signJwt } from '../../auth/jwt.js';
import { findProfileByUsername, touchLastLogin } from '../../db/profilesRepo.js';
import { UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { okResponse } from '../../lib/httpResponse.js';
import { withErrorHandling } from '../../lib/handlerWrapper.js';

async function loginHandler(event: APIGatewayProxyEventV2) {
  const parsed = loginRequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) throw new ValidationError('username and password are required');

  const profile = await findProfileByUsername(parsed.data.username);
  if (!profile) throw new UnauthorizedError('Invalid username or password');

  const passwordMatches = await comparePassword(parsed.data.password, profile.passwordHash);
  if (!passwordMatches) throw new UnauthorizedError('Invalid username or password');

  const token = await signJwt({
    profileId: profile.profileId,
    familyId: profile.familyId,
    role: profile.role,
  });
  await touchLastLogin(profile.familyId, profile.profileId);

  const response: LoginResponse = {
    token,
    profile: {
      profileId: profile.profileId,
      displayName: profile.displayName,
      role: profile.role,
      avatarKey: profile.avatarKey,
      preferredLanguage: profile.preferredLanguage,
    },
  };
  return okResponse(response);
}

export const handler = withErrorHandling(loginHandler);
