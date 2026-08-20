import type { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import type { ProfileRole } from '@teagent/shared';
import { UnauthorizedError } from './errors.js';

export interface LambdaAuthorizerContext {
  profileId: string;
  familyId: string;
  role: ProfileRole;
}

export type AuthenticatedEvent =
  APIGatewayProxyEventV2WithLambdaAuthorizer<LambdaAuthorizerContext>;

export function getAuthContext(event: AuthenticatedEvent): LambdaAuthorizerContext {
  const ctx = event.requestContext.authorizer?.lambda;
  if (!ctx?.profileId || !ctx.familyId) {
    throw new UnauthorizedError();
  }
  return ctx;
}
