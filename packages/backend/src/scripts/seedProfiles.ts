/**
 * Creates a demo family (one parent, one kid) in DynamoDB so there's something to log in with.
 * There's no signup flow by design (see docs/deploy.md §3) — this script is the convenient path
 * for local/dev testing only. Idempotent: skips a profile if its username already exists.
 *
 * Usage: npm run seed -w @teagent/backend
 * Works against DynamoDB Local (set DYNAMODB_ENDPOINT, see docker-compose.yml — no AWS account
 * needed) or a real, already-deployed table (set PROFILES_TABLE_NAME + real AWS credentials).
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

const SEED_PROFILES: SeedProfile[] = [
  {
    username: 'parent',
    password: 'parent1234',
    displayName: 'Parent',
    avatarKey: 'owl',
    role: 'parent',
    preferredLanguage: 'hin',
  },
  {
    username: 'kid',
    password: '1234',
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
