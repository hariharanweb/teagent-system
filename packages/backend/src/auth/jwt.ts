import { jwtVerify, SignJWT } from 'jose';
import type { JwtClaims, ProfileRole } from '@teagent/shared';
import { getJwtSigningSecret } from './ssm.js';

const JWT_EXPIRY = '12h'; // short-lived; re-login via profile-select is trivial for this app

let cachedSecretKey: Uint8Array | undefined;

async function getSecretKey(): Promise<Uint8Array> {
  if (!cachedSecretKey) {
    const secret = await getJwtSigningSecret();
    cachedSecretKey = new TextEncoder().encode(secret);
  }
  return cachedSecretKey;
}

export async function signJwt(claims: {
  profileId: string;
  familyId: string;
  role: ProfileRole;
}): Promise<string> {
  const secretKey = await getSecretKey();
  return new SignJWT({ familyId: claims.familyId, role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.profileId)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secretKey);
}

export async function verifyJwt(token: string): Promise<JwtClaims> {
  const secretKey = await getSecretKey();
  const { payload } = await jwtVerify(token, secretKey);
  return {
    sub: payload.sub as string,
    familyId: payload.familyId as string,
    role: payload.role as ProfileRole,
    iat: payload.iat as number,
    exp: payload.exp as number,
  };
}
