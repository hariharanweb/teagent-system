import type { APIGatewaySimpleAuthorizerWithContextResult, APIGatewayRequestAuthorizerEventV2 } from 'aws-lambda';
import { verifyJwt } from '../auth/jwt.js';
import type { LambdaAuthorizerContext } from '../lib/authContext.js';

type AuthorizerResult = APIGatewaySimpleAuthorizerWithContextResult<LambdaAuthorizerContext>;

const DENY: AuthorizerResult = { isAuthorized: false, context: {} as LambdaAuthorizerContext };

export async function handler(
  event: APIGatewayRequestAuthorizerEventV2,
): Promise<AuthorizerResult> {
  const header = event.headers?.authorization ?? event.headers?.Authorization;
  if (!header?.startsWith('Bearer ')) return DENY;

  const token = header.slice('Bearer '.length);
  try {
    const claims = await verifyJwt(token);
    return {
      isAuthorized: true,
      context: { profileId: claims.sub, familyId: claims.familyId, role: claims.role },
    };
  } catch {
    return DENY;
  }
}
