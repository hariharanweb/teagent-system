/**
 * Creates a demo family (one parent, one kid) in DynamoDB so there's something to log in with.
 * There's no signup flow by design (see docs/deploy.md §3) — this script is the convenient path
 * for local/dev testing only. Idempotent: skips a profile if its username already exists.
 *
 * Usage: npm run seed -w @teagent/backend
 * Works against DynamoDB Local (set DYNAMODB_ENDPOINT, see docker-compose.yml — no AWS account
 * needed) or a real, already-deployed table (set PROFILES_TABLE_NAME + real AWS credentials).
 *
 * Passwords come from SEED_PARENT_PASSWORD / SEED_KID_PASSWORD env vars (fall back to an
 * obviously-fake placeholder if unset) rather than being hardcoded — this repo is public, and a
 * real-looking committed password is a real password until someone changes it (see
 * `change-password` script). Set these before seeding anywhere that matters:
 *   SEED_PARENT_PASSWORD=... SEED_KID_PASSWORD=... npm run seed -w @teagent/backend
 */
import '../lib/loadEnv.js';
import { randomUUID } from 'node:crypto';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { hashPassword } from '../auth/password.js';
import { findProfileByUsername } from '../db/profilesRepo.js';
import { dynamoDocumentClient as client } from '../db/dynamoClient.js';

const TABLE_NAME = process.env.PROFILES_TABLE_NAME ?? 'TeagentProfiles-dev';

interface SeedProfile {
  username: string;
  password: string;
  displayName: string;
  avatarKey: string;
  role: 'parent' | 'kid';
  preferredLanguage: 'hin' | 'kan';
}

const FALLBACK_PASSWORD_PLACEHOLDER = 'CHANGE_ME_set_SEED_*_PASSWORD_env_var';

const SEED_PROFILES: SeedProfile[] = [
  {
    username: 'parent',
    password: process.env.SEED_PARENT_PASSWORD ?? FALLBACK_PASSWORD_PLACEHOLDER,
    displayName: 'Parent',
    avatarKey: 'owl',
    role: 'parent',
    preferredLanguage: 'hin',
  },
  {
    username: 'kid',
    password: process.env.SEED_KID_PASSWORD ?? FALLBACK_PASSWORD_PLACEHOLDER,
    displayName: 'Kiddo',
    avatarKey: 'panda',
    role: 'kid',
    preferredLanguage: 'hin',
  },
];

async function seedProfile(profile: SeedProfile, familyId: string): Promise<void> {
  const existing = await findProfileByUsername(profile.username);
  if (existing) {
    console.log(`Skipping "${profile.username}" — already exists (profileId ${existing.profileId}).`);
    return;
  }

  const profileId = randomUUID();
  const passwordHash = await hashPassword(profile.password);
  const now = Date.now();

  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `FAMILY#${familyId}`,
        SK: `PROFILE#${profileId}`,
        GSI1PK: `USERNAME#${profile.username.toLowerCase()}`,
        GSI1SK: 'PROFILE',
        profileId,
        familyId,
        username: profile.username,
        passwordHash,
        displayName: profile.displayName,
        avatarKey: profile.avatarKey,
        role: profile.role,
        preferredLanguage: profile.preferredLanguage,
        createdAt: now,
        lastLoginAt: null,
      },
    }),
  );
  console.log(`Created "${profile.username}" / "${profile.password}" (profileId ${profileId}).`);
}

async function resolveFamilyId(): Promise<string> {
  // Reuse an existing seed profile's familyId if one is already there, so re-running this script
  // after a partial seed doesn't split the demo family across two different familyIds.
  for (const profile of SEED_PROFILES) {
    const existing = await findProfileByUsername(profile.username);
    if (existing) return existing.familyId;
  }
  return randomUUID();
}

async function main() {
  if (SEED_PROFILES.some((p) => p.password === FALLBACK_PASSWORD_PLACEHOLDER)) {
    console.warn(
      'WARNING: SEED_PARENT_PASSWORD/SEED_KID_PASSWORD not set — using an unusable placeholder password. Set them if you actually need to log in.',
    );
  }
  console.log(`Seeding demo profiles into table "${TABLE_NAME}"...`);
  const familyId = await resolveFamilyId();
  for (const profile of SEED_PROFILES) {
    await seedProfile(profile, familyId);
  }
  console.log('\nLog in with:');
  for (const profile of SEED_PROFILES) {
    console.log(`  ${profile.username} / ${profile.password}`);
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exitCode = 1;
});
