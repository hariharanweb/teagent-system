import { z } from 'zod';
import { LANGUAGE_CODES } from './languages.js';

export const loginRequestSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const profileRoleSchema = z.enum(['parent', 'kid']);
export type ProfileRole = z.infer<typeof profileRoleSchema>;

export const profileSummarySchema = z.object({
  profileId: z.string().uuid(),
  displayName: z.string(),
  role: profileRoleSchema,
  avatarKey: z.string(),
  preferredLanguage: z.enum(LANGUAGE_CODES),
});
export type ProfileSummary = z.infer<typeof profileSummarySchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  profile: profileSummarySchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const familyProfilesResponseSchema = z.object({
  profiles: z.array(profileSummarySchema),
});
export type FamilyProfilesResponse = z.infer<typeof familyProfilesResponseSchema>;

/** Claims carried in the signed JWT, and injected into the Lambda authorizer context. */
export const jwtClaimsSchema = z.object({
  sub: z.string().uuid(), // profileId
  familyId: z.string().uuid(),
  role: profileRoleSchema,
  iat: z.number(),
  exp: z.number(),
});
export type JwtClaims = z.infer<typeof jwtClaimsSchema>;
